# Gunicorn configuration file
import multiprocessing

# Server socket
bind = "0.0.0.0:10000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
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