import logging
from flask import Flask, render_template, request, jsonify, Response
import google.generativeai as genai
import os
from dotenv import load_dotenv
import traceback
import json
from analysis_stages import STAGES_DETAILS, get_stage_prompt
import time

# Configure logging with colors
class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors"""
    grey = "\x1b[38;21m"
    blue = "\x1b[38;5;39m"
    yellow = "\x1b[38;5;226m"
    red = "\x1b[38;5;196m"
    bold_red = "\x1b[31;1m"
    reset = "\x1b[0m"

    def __init__(self, fmt):
        super().__init__()
        self.fmt = fmt
        self.FORMATS = {
            logging.DEBUG: self.grey + self.fmt + self.reset,
            logging.INFO: self.blue + self.fmt + self.reset,
            logging.WARNING: self.yellow + self.fmt + self.reset,
            logging.ERROR: self.red + self.fmt + self.reset,
            logging.CRITICAL: self.bold_red + self.fmt + self.reset
        }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
fmt = ColoredFormatter('%(asctime)s - %(levelname)s - %(message)s')
ch.setFormatter(fmt)
logger.addHandler(ch)

# Load environment variables
load_dotenv()

# Get API key
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GEMINI_API_KEY:
    logger.error("API key not found in .env file")
    raise ValueError("الرجاء تعيين GOOGLE_API_KEY في ملف .env")

logger.info(f"API Key found: {GEMINI_API_KEY[:5]}...{GEMINI_API_KEY[-5:]}")

# Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)

# Initialize Flask app
app = Flask(__name__)

# Define the 12 stages in order
STAGES = [
    "المرحلة الأولى: تحديد المشكلة القانونية",
    "المرحلة الثانية: جمع المعلومات والوثائق",
    "المرحلة الثالثة: تحليل النصوص القانونية",
    "المرحلة الرابعة: تحديد القواعد القانونية المنطبقة",
    "المرحلة الخامسة: تحليل السوابق القضائية",
    "المرحلة السادسة: تحليل الفقه القانوني",
    "المرحلة السابعة: تحليل الظروف الواقعية",
    "المرحلة الثامنة: تحديد الحلول القانونية الممكنة",
    "المرحلة التاسعة: تقييم الحلول القانونية",
    "المرحلة العاشرة: اختيار الحل الأمثل",
    "المرحلة الحادية عشرة: صياغة الحل القانوني",
    "المرحلة الثانية عشرة: تقديم التوصيات"
]

# Check if running on Render
IS_RENDER = os.environ.get('RENDER', False)

def verify_and_enhance_analysis(model, stage, analysis, text):
    """Verify and enhance the analysis for accuracy and completeness"""
    try:
        logger.info(f"🔍 جاري التحقق من دقة تحليل {stage}")
        
        # Create verification prompt
        verification_prompt = f"""
        قم بمراجعة وتحسين التحليل التالي للمرحلة: {stage}
        
        النص الأصلي:
        {text}
        
        التحليل الحالي:
        {analysis}
        
        قم بما يلي:
        1. تحقق من دقة المعلومات القانونية
        2. تأكد من تغطية جميع جوانب المرحلة
        3. أضف أي معلومات قانونية مهمة مفقودة
        4. تحقق من تناسق الاستنتاجات مع النص الأصلي
        5. قم بتحسين الصياغة والوضوح
        
        قدم التحليل المحسن مع شرح التغييرات التي تمت.
        """
        
        # Get enhanced analysis
        response = model.generate_content(verification_prompt)
        if response and response.text:
            enhanced_analysis = response.text
            logger.info(f"✅ تم تحسين تحليل {stage}")
            return enhanced_analysis
        else:
            logger.warning(f"⚠️ لم يتم الحصول على تحليل محسن لـ {stage}")
            return analysis
            
    except Exception as e:
        logger.error(f"❌ خطأ في التحقق من تحليل {stage}: {str(e)}")
        return analysis

def generate_analysis(text, stage_index):
    """Generate analysis for a single stage"""
    try:
        logger.info("🚀 بدء عملية التحليل القانوني...")
        logger.info(f"📝 النص المدخل: {text[:100]}...")
        
        logger.info("⚙️ تهيئة نموذج Gemini...")
        model = genai.GenerativeModel('models/gemini-2.0-flash-001')
        
        stage = STAGES[stage_index]
        try:
            logger.info(f"\n📊 المرحلة {stage_index + 1}/12: {stage}")
            logger.info("🔍 جاري تحليل المرحلة...")
            
            prompt = get_stage_prompt(stage, text)
            logger.debug(f"Prompt for {stage}: {prompt[:200]}...")
            
            # Get initial analysis with retry mechanism for Render
            max_retries = 3 if IS_RENDER else 1
            retry_count = 0
            initial_analysis = None
            
            while retry_count < max_retries:
                try:
                    response = model.generate_content(prompt)
                    if response and response.text:
                        initial_analysis = response.text
                        logger.info(f"✅ تم اكتمال التحليل الأولي لـ {stage}")
                        break
                    else:
                        logger.warning(f"⚠️ استجابة فارغة للمرحلة: {stage}")
                        retry_count += 1
                        if retry_count < max_retries:
                            logger.info(f"🔄 إعادة المحاولة {retry_count + 1}/{max_retries}...")
                            time.sleep(2)  # Wait before retrying
                except Exception as e:
                    logger.error(f"❌ خطأ في تحليل المرحلة {stage} (محاولة {retry_count + 1}): {str(e)}")
                    retry_count += 1
                    if retry_count < max_retries:
                        logger.info(f"🔄 إعادة المحاولة {retry_count + 1}/{max_retries}...")
                        time.sleep(2)  # Wait before retrying
                    else:
                        raise  # Re-raise the exception if all retries failed
            
            if initial_analysis:
                # Verify and enhance the analysis with retry mechanism for Render
                try:
                    enhanced_analysis = verify_and_enhance_analysis(model, stage, initial_analysis, text)
                    
                    result = {
                        'stage': stage,
                        'description': STAGES_DETAILS[stage]['description'],
                        'key_points': STAGES_DETAILS[stage]['key_points'],
                        'analysis': enhanced_analysis,
                        'status': 'completed',
                        'stage_index': stage_index,
                        'total_stages': len(STAGES)
                    }
                except Exception as e:
                    logger.error(f"❌ خطأ في التحقق من تحليل {stage}: {str(e)}")
                    result = {
                        'stage': stage,
                        'description': STAGES_DETAILS[stage]['description'],
                        'key_points': STAGES_DETAILS[stage]['key_points'],
                        'analysis': initial_analysis,
                        'status': 'completed',
                        'stage_index': stage_index,
                        'total_stages': len(STAGES)
                    }
            else:
                logger.warning(f"⚠️ فشل جميع محاولات تحليل المرحلة: {stage}")
                result = {
                    'stage': stage,
                    'description': STAGES_DETAILS[stage]['description'],
                    'key_points': STAGES_DETAILS[stage]['key_points'],
                    'analysis': "لم يتم الحصول على تحليل لهذه المرحلة بعد عدة محاولات",
                    'status': 'error',
                    'stage_index': stage_index,
                    'total_stages': len(STAGES)
                }
            
            # Stream the result for this stage
            yield f"data: {json.dumps(result, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            logger.error(f"❌ خطأ في معالجة المرحلة {stage}: {str(e)}")
            error_result = {
                'stage': stage,
                'description': STAGES_DETAILS[stage]['description'],
                'key_points': STAGES_DETAILS[stage]['key_points'],
                'analysis': f"حدث خطأ في معالجة هذه المرحلة: {str(e)}",
                'status': 'error',
                'stage_index': stage_index,
                'total_stages': len(STAGES)
            }
            yield f"data: {json.dumps(error_result, ensure_ascii=False)}\n\n"
            
        logger.info(f"\n✨ تم اكتمال تحليل المرحلة {stage_index + 1} بنجاح!")
            
    except Exception as e:
        logger.error(f"❌ خطأ في generate_analysis: {str(e)}")
        logger.error(f"تفاصيل الخطأ: {traceback.format_exc()}")
        error_result = {
            'error': str(e),
            'status': 'error',
            'stage_index': stage_index,
            'total_stages': len(STAGES)
        }
        yield f"data: {json.dumps(error_result, ensure_ascii=False)}\n\n"

@app.route('/')
def index():
    logger.info("📄 تم تحميل الصفحة الرئيسية")
    return render_template('index.html', stages=STAGES_DETAILS)

@app.route('/analyze', methods=['GET', 'POST'])
def analyze():
    if request.method == 'GET':
        text = request.args.get('text', '')
        stage_index = int(request.args.get('stage', 0))
    else:
        text = request.json.get('text', '')
        stage_index = request.json.get('stage', 0)
    
    if not text:
        logger.warning("⚠️ لم يتم تقديم نص للتحليل")
        return jsonify({'error': 'No text provided'}), 400
    
    if stage_index < 0 or stage_index >= len(STAGES):
        logger.warning("⚠️ رقم مرحلة غير صحيح")
        return jsonify({'error': 'Invalid stage number'}), 400
    
    logger.info(f"🔄 بدء طلب تحليل جديد للمرحلة {stage_index + 1}")
    return Response(generate_analysis(text, stage_index), mimetype='text/event-stream')

if __name__ == '__main__':
    logger.info("🌐 بدء تشغيل تطبيق Flask...")
    app.run(debug=True) 