"""
OMR Scanner — FastAPI + Socket.IO entry point.

Run with:
    uvicorn main:socket_app --reload --port 8080

No Redis or Celery required — processing runs as an async background task
in the same process.  For high-throughput production use, swap the
BackgroundTasks approach for the Celery worker in tasks/omr_task.py.
"""

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import exams, scans, students
from socket_manager import sio

# ---------------------------------------------------------------------------
# DB bootstrap (creates tables if they don't exist)
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# Socket.IO events
# ---------------------------------------------------------------------------
@sio.event
async def connect(sid, environ):
    pass

@sio.event
async def disconnect(sid):
    pass

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="OMR Scanner", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(exams.router,    prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(scans.router,    prefix="/api")

app.mount("/static",  StaticFiles(directory="static"),  name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def serve_index():
    return FileResponse("static/index.html")


# ---------------------------------------------------------------------------
# Wrap with Socket.IO ASGI middleware (serves /socket.io/socket.io.js too)
# ---------------------------------------------------------------------------
socket_app = socketio.ASGIApp(sio, app)
