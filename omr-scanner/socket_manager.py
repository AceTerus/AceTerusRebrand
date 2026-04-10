"""
Shared Socket.IO server instance.
Imported by both main.py and background task code so both
can emit events without circular dependencies.
"""
import socketio

# Simple in-process server — no Redis manager required.
# For multi-worker production deployments swap this for:
#   socketio.AsyncServer(async_mode='asgi',
#       client_manager=socketio.AsyncRedisManager('redis://...'))
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)
