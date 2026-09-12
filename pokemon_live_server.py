import asyncio
import io
import json
import logging
import os
import time
import traceback
from aiohttp import web
import numpy as np
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pokemon_live")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_env():
    for env_path in [os.path.join(BASE_DIR, ".env"), os.path.join(BASE_DIR, ".env.local")]:
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()

API_KEY = os.environ.get("REACTOR_API_KEY", "")
PRIMARY_SEED = os.path.join(BASE_DIR, "assets", "pokemon.png")
FALLBACK_SEED = os.path.expanduser("~/Desktop/pokemon.png")
STATIC_DIR = os.path.join(BASE_DIR, "pokemon-battle", "static")

# First prompt sets the strict two-character constraint
INITIAL_PROMPT = "The Pikachu on the left and the Charizard on the right hold position. Exactly two Pokémon in the scene: one Pikachu on the left, one Charizard on the right."

# Ultra-short action prompts for steering
PROMPTS = {
    "IDLE": "Pikachu and Charizard hold position",
    "HOLDING_POSITION": "Pikachu and Charizard hold position",
    "THUNDERBOLT": "Pikachu uses Thunderbolt",
    "QUICK_ATTACK": "Pikachu uses Quick Attack",
    "IRON_TAIL": "Pikachu uses Iron Tail",
    "THUNDER_WAVE": "Pikachu uses Thunder Wave",
    "FLAMETHROWER": "Charizard uses Flamethrower",
    "FIRE_BLAST": "Charizard uses Fire Blast",
    "WING_ATTACK": "Charizard uses Wing Attack",
    "DRAGON_CLAW": "Charizard uses Dragon Claw",
    "FAINTED": "Charizard faints"
}


class PromptSteeredOrbisGenerator:
    def __init__(self):
        self.reactor = None
        self.status = "initializing"
        self.current_prompt = PROMPTS["HOLDING_POSITION"]
        self.current_move = "HOLDING_POSITION"
        self.actor = "system"
        self.frame_count = 0
        self.total_frames_streamed = 0
        self.latest_jpeg = None
        self.ws_clients = set()
        self.session_count = 0
        self.fps = 0
        self._window_frames = 0
        self._fps_timestamp = time.time()
        self.seed_used = PRIMARY_SEED
        self.is_live = False
        self.idle_task = None

        self._init_first_frame()

    def _init_first_frame(self):
        seed_path = PRIMARY_SEED if os.path.exists(PRIMARY_SEED) else FALLBACK_SEED
        if os.path.exists(seed_path):
            try:
                img = Image.open(seed_path).convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=85)
                self.latest_jpeg = buf.getvalue()
                logger.info(f"Initialized base frame from: {seed_path}")
            except Exception as e:
                logger.error(f"Failed to load base frame: {e}")

    async def broadcast(self, data: dict):
        if not self.ws_clients:
            return
        msg = json.dumps(data)
        to_remove = set()
        for ws in list(self.ws_clients):
            try:
                await ws.send_str(msg)
            except Exception:
                to_remove.add(ws)
        self.ws_clients.difference_update(to_remove)

    def on_frame(self, frame, frame_id, ts, user_data):
        try:
            self.frame_count += 1
            self.total_frames_streamed += 1
            self._window_frames += 1
            self.is_live = True
            now = time.time()
            if now - self._fps_timestamp >= 1.0:
                self.fps = round(self._window_frames / (now - self._fps_timestamp), 1)
                self._window_frames = 0
                self._fps_timestamp = now

            img = Image.fromarray(frame)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=75)
            self.latest_jpeg = buf.getvalue()
        except Exception as e:
            logger.error(f"Error encoding live frame: {e}")

    async def run_forever(self):
        """Continuous pure live video stream from Visko Orbis."""
        from reactor_sdk import Reactor

        logger.info("Starting Pure Live Orbis Generation Loop...")

        while True:
            self.session_count += 1
            self.status = "connecting"
            logger.info(f"=== Connecting Orbis Session #{self.session_count} ===")
            await self.broadcast({
                "type": "status",
                "status": "connecting",
                "session": self.session_count,
                "message": f"Connecting to Visko Orbis (Session #{self.session_count})..."
            })

            while True:
                try:
                    self.reactor = Reactor("reactor/visko-orbis-stable", api_key=API_KEY)
                    await self.reactor.connect()
                    while self.reactor.status != "ready":
                        await asyncio.sleep(0.4)
                    logger.info(f"Connected to Reactor! Session ID: {self.reactor.session_id}")
                    break
                except Exception as e:
                    logger.warning(f"Waiting for Reactor slot: {e}")
                    await asyncio.sleep(4)

            try:
                self.status = "ready"
                video_track = self.reactor.tracks.with_direction("recvonly").with_kind("video").one()
                video_track.on_frame(self.on_frame)

                seed_to_use = PRIMARY_SEED if os.path.exists(PRIMARY_SEED) else FALLBACK_SEED
                logger.info(f"Uploading seed to Orbis: {seed_to_use}")
                try:
                    ref = await self.reactor.upload_file(seed_to_use)
                    self.seed_used = seed_to_use
                except Exception as upload_err:
                    logger.warning(f"Upload of {seed_to_use} failed ({upload_err}), trying {FALLBACK_SEED}")
                    ref = await self.reactor.upload_file(FALLBACK_SEED)
                    self.seed_used = FALLBACK_SEED

                await self.reactor.send_command("set_image", {"image": ref})
                await self.reactor.send_command("set_prompt", {"prompt": INITIAL_PROMPT})

                logger.info("Starting Visko Orbis live generation...")
                await self.reactor.send_command("start", {})
                self.status = "generating"
                self.frame_count = 0

                await self.broadcast({
                    "type": "session_started",
                    "status": "generating",
                    "session": self.session_count,
                    "prompt": self.current_prompt,
                    "move": self.current_move
                })

                while self.reactor and getattr(self.reactor, "status", None) in ["ready", "generating", "connected"]:
                    await asyncio.sleep(0.5)
                    await self.broadcast({
                        "type": "heartbeat",
                        "status": self.status,
                        "fps": self.fps,
                        "session": self.session_count,
                        "frame_count": self.frame_count,
                        "current_move": self.current_move,
                        "current_prompt": self.current_prompt,
                        "is_live": self.is_live
                    })

            except Exception as e:
                logger.error(f"Error in session #{self.session_count}: {e}\n{traceback.format_exc()}")
            finally:
                logger.info(f"Session #{self.session_count} ended. Resetting handle...")
                if self.reactor:
                    try:
                        self.reactor.close()
                    except Exception:
                        pass
                    self.reactor = None
                self.status = "looping"
                await asyncio.sleep(3)

    async def steer(self, move_name: str, custom_prompt: str = None, actor: str = "pikachu"):
        key = move_name.upper().replace(" ", "_")
        prompt = PROMPTS.get(key) or custom_prompt or PROMPTS["HOLDING_POSITION"]
        self.current_move = move_name
        self.current_prompt = prompt
        self.actor = actor

        logger.info(f"Steering Orbis -> Move: {move_name} | Actor: {actor} | Prompt: {prompt[:65]}...")

        if self.reactor and self.status == "generating":
            try:
                await self.reactor.send_command("set_prompt", {"prompt": prompt})
                logger.info("Dispatched attack prompt to Visko Orbis!")
            except Exception as e:
                logger.error(f"Error steering Orbis: {e}")

        await self.broadcast({
            "type": "steered",
            "move": move_name,
            "actor": actor,
            "prompt": prompt,
            "timestamp": time.time()
        })

        if self.idle_task and not self.idle_task.done():
            self.idle_task.cancel()

        # After attack animation plays (6.5s), prompt Orbis to return to holding position
        async def return_to_holding_position():
            await asyncio.sleep(6.5)
            logger.info("Returning Orbis prompt to holding position...")
            self.current_move = "HOLDING_POSITION"
            self.current_prompt = PROMPTS["HOLDING_POSITION"]

            if self.reactor and self.status == "generating":
                try:
                    await self.reactor.send_command("set_prompt", {"prompt": PROMPTS["HOLDING_POSITION"]})
                    logger.info("Dispatched 'holding position' prompt to Visko Orbis!")
                except Exception as e:
                    logger.error(f"Error setting holding position: {e}")

            await self.broadcast({
                "type": "holding_position",
                "move": "HOLDING_POSITION",
                "prompt": PROMPTS["HOLDING_POSITION"],
                "message": "Pokémon holding position awaiting next move."
            })

        self.idle_task = asyncio.create_task(return_to_holding_position())
        return True

    async def reset(self):
        logger.info("Resetting battle session...")
        self.current_move = "HOLDING_POSITION"
        self.current_prompt = PROMPTS["HOLDING_POSITION"]
        self.actor = "system"

        if self.idle_task and not self.idle_task.done():
            self.idle_task.cancel()

        self._init_first_frame()

        if self.reactor and self.status == "generating":
            try:
                seed_to_use = PRIMARY_SEED if os.path.exists(PRIMARY_SEED) else FALLBACK_SEED
                ref = await self.reactor.upload_file(seed_to_use)
                await self.reactor.send_command("set_image", {"image": ref})
                await self.reactor.send_command("set_prompt", {"prompt": INITIAL_PROMPT})
                logger.info("Re-uploaded seed and set initial two-pokemon prompt on Orbis!")
            except Exception as e:
                logger.error(f"Error resetting Orbis session: {e}")

        await self.broadcast({
            "type": "reset",
            "prompt": PROMPTS["HOLDING_POSITION"],
            "message": "Battle reset to initial stance."
        })
        return True

generator = PromptSteeredOrbisGenerator()

async def handle_index(request):
    return web.FileResponse(os.path.join(STATIC_DIR, "index.html"))

async def handle_reset(request):
    await generator.reset()
    return web.json_response({"success": True, "message": "Battle reset successfully"})

async def handle_status(request):
    return web.json_response({
        "status": generator.status,
        "fps": generator.fps,
        "session": generator.session_count,
        "frame_count": generator.frame_count,
        "total_frames": generator.total_frames_streamed,
        "current_move": generator.current_move,
        "current_prompt": generator.current_prompt,
        "actor": generator.actor,
        "is_live": generator.is_live,
        "seed": generator.seed_used
    })

async def handle_steer(request):
    try:
        data = await request.json()
    except Exception:
        data = {}
    move = data.get("move", "THUNDERBOLT")
    prompt = data.get("prompt", None)
    actor = data.get("actor", "pikachu")

    await generator.steer(move, prompt, actor)
    return web.json_response({
        "success": True,
        "move": move,
        "actor": actor,
        "prompt": generator.current_prompt
    })

async def handle_live_stream(request):
    """100% continuous video stream straight from Visko Orbis."""
    response = web.StreamResponse(
        status=200,
        reason='OK',
        headers={
            'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*'
        }
    )
    await response.prepare(request)

    try:
        while True:
            if generator.latest_jpeg:
                header = (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n'
                    b'Content-Length: ' + str(len(generator.latest_jpeg)).encode('utf-8') + b'\r\n\r\n'
                )
                await response.write(header + generator.latest_jpeg + b'\r\n')
            await asyncio.sleep(0.045) # ~22 fps smooth live stream
    except (asyncio.CancelledError, ConnectionResetError):
        pass
    return response

async def handle_ws(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    generator.ws_clients.add(ws)
    logger.info(f"WebSocket client connected. Active: {len(generator.ws_clients)}")

    await ws.send_str(json.dumps({
        "type": "init",
        "status": generator.status,
        "fps": generator.fps,
        "session": generator.session_count,
        "current_move": generator.current_move,
        "current_prompt": generator.current_prompt,
        "is_live": generator.is_live,
        "seed": os.path.basename(generator.seed_used)
    }))

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                try:
                    payload = json.loads(msg.data)
                    action = payload.get("action")
                    if action == "steer":
                        await generator.steer(
                            payload.get("move", "THUNDERBOLT"),
                            payload.get("prompt"),
                            payload.get("actor", "pikachu")
                        )
                    elif action == "reset":
                        await generator.reset()
                except Exception as e:
                    logger.error(f"WS parse error: {e}")
    finally:
        generator.ws_clients.discard(ws)

    return ws

async def on_startup(app):
    asyncio.create_task(generator.run_forever())

async def on_cleanup(app):
    if generator.reactor:
        try:
            generator.reactor.close()
        except Exception:
            pass

def make_app():
    app = web.Application()
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    app.router.add_get('/', handle_index)
    app.router.add_get('/index.html', handle_index)
    app.router.add_get('/api/status', handle_status)
    app.router.add_post('/api/steer', handle_steer)
    app.router.add_post('/api/reset', handle_reset)
    app.router.add_get('/api/reset', handle_reset)
    app.router.add_get('/api/live_stream', handle_live_stream)
    app.router.add_get('/ws', handle_ws)
    app.router.add_static('/', STATIC_DIR, show_index=False)
    return app

if __name__ == "__main__":
    app = make_app()
    web.run_app(app, host="0.0.0.0", port=8001)
