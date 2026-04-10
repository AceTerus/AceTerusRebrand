import os
from pathlib import Path

# SQLite by default so no PostgreSQL install is required.
# Override with DATABASE_URL env var to point at a real Postgres instance.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./omr.db"
)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(exist_ok=True)

TEMPLATE_CONFIG_PATH = Path(os.getenv("TEMPLATE_CONFIG_PATH", "template_config.json"))
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))

# These are only used when running with full Celery + Redis stack
CELERY_BROKER          = f"{REDIS_URL}/0"
CELERY_BACKEND         = f"{REDIS_URL}/1"
CELERY_SOCKETIO_CHANNEL = f"{REDIS_URL}/2"
