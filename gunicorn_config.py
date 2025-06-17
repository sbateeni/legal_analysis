# Gunicorn configuration file
import multiprocessing
import os

# Server socket
bind = "0.0.0.0:10000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'gevent'
worker_connections = 1000
timeout = 300  # 5 minutes timeout
keepalive = 2

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Process naming
proc_name = 'legal_analysis'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL
keyfile = None
certfile = None

# Server hooks
def on_starting(server):
    server.log.info("Starting Legal Analysis Server")

def on_reload(server):
    server.log.info("Reloading Legal Analysis Server")

def on_exit(server):
    server.log.info("Shutting down Legal Analysis Server")

# إعدادات الأداء
max_requests = 1000
max_requests_jitter = 50

# إعدادات الذاكرة
worker_memory_limit = 512 * 1024 * 1024  # 512 ميجابايت

# إعدادات الأمان
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# إعدادات الأداء
preload_app = True

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def pre_fork(server, worker):
    pass

def pre_exec(server):
    server.log.info("Forked child, re-executing.")

def when_ready(server):
    server.log.info("Server is ready. Spawning workers")

def worker_int(worker):
    worker.log.info("worker received INT or QUIT signal")

def worker_abort(worker):
    worker.log.info("worker received SIGABRT signal") 