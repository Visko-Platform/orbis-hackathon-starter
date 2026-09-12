import asyncio
import os
import shutil
import subprocess
import traceback
from PIL import Image

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
SEED_IMAGE = os.path.join(BASE_DIR, "assets", "pokemon.png")
DEMO_MP4 = os.path.join(BASE_DIR, "demo_battle.mp4")
FRAMES_DIR = os.path.join(BASE_DIR, "scratch", "demo_frames")
QC_DIR = os.path.join(BASE_DIR, "pokemon-battle", "static", "demo_qc")

async def main():
    from reactor_sdk import Reactor

    if os.path.exists(FRAMES_DIR):
        shutil.rmtree(FRAMES_DIR)
    os.makedirs(FRAMES_DIR, exist_ok=True)
    os.makedirs(QC_DIR, exist_ok=True)

    print("Connecting to reactor/visko-orbis-stable...")
    r = Reactor("reactor/visko-orbis-stable", api_key=API_KEY)

    frame_idx = 0

    # Strict prompts that anchor character identity and location to avoid duplicates
    p_initial = (
        "The Pikachu on the left and the Charizard on the right hold position in tense battle stances "
        "facing each other on the dirt path. Exactly two Pokémon in the scene: one Pikachu on the left, "
        "one Charizard on the right. No duplicate Pokémon, no other characters."
    )

    battle_sequence = [
        # (duration_seconds, prompt, description)
        (
            7,
            "The Pikachu on the left and the Charizard on the right hold position. "
            "Exactly two Pokémon in the scene: one Pikachu on the left, one Charizard on the right.",
            "Turn 1: Holding Position"
        ),
        (
            8,
            "The Pikachu on the left stays in place and uses Thunderbolt, discharging lightning bolts across the path into the Charizard on the right. "
            "Exactly two Pokémon in the scene: one Pikachu on the left, one Charizard on the right. No duplicate characters.",
            "Turn 2: Pikachu uses Thunderbolt"
        ),
        (
            6,
            "The Pikachu on the left and the Charizard on the right hold position. "
            "Exactly two Pokémon in the scene: one Pikachu on the left, one Charizard on the right.",
            "Turn 3: Post-attack recovery"
        ),
        (
            8,
            "The Charizard on the right stays on the right and uses Flamethrower, breathing a roaring stream of fire across the path at the Pikachu on the left. "
            "Exactly two Pokémon in the scene: one Pikachu on the left, one Charizard on the right.",
            "Turn 4: Charizard uses Flamethrower"
        ),
        (
            7,
            "The Pikachu on the left dashes forward as a speed blur and uses Quick Attack against the Charizard on the right. "
            "Exactly two Pokémon in the scene: one Pikachu on the left, one Charizard on the right.",
            "Turn 5: Pikachu uses Quick Attack"
        ),
        (
            7,
            "The Charizard on the right wobbles and collapses onto the ground, defeated. The Pikachu on the left watches. "
            "Exactly two Pokémon in the scene: one Pikachu on the left, one Charizard on the right.",
            "Turn 6: Charizard faints"
        )
    ]

    while True:
        try:
            print("Attempting connection to Reactor...")
            await r.connect()
            while r.status != "ready":
                await asyncio.sleep(0.5)
            print(f"Connected to Reactor! Session ID: {r.session_id}")
            break
        except Exception as e:
            err = str(e)
            print(f"Waiting for Reactor slot: {err}")
            await asyncio.sleep(4)

    try:
        video_track = r.tracks.with_direction("recvonly").with_kind("video").one()

        @video_track.on_frame
        def on_video_frame(frame, frame_id, ts, user_data):
            nonlocal frame_idx
            frame_idx += 1
            img = Image.fromarray(frame)
            fname = os.path.join(FRAMES_DIR, f"frame_{frame_idx:05d}.jpg")
            img.save(fname, format="JPEG", quality=85)
            if frame_idx % 30 == 0:
                print(f"Streamed {frame_idx} frames from Orbis...")

        print(f"Uploading seed image {SEED_IMAGE}...")
        ref = await r.upload_file(SEED_IMAGE)
        await r.send_command("set_image", {"image": ref})
        await r.send_command("set_prompt", {"prompt": p_initial})

        print("Starting Visko Orbis video generation...")
        await r.send_command("start", {})

        for idx, (dur, p, desc) in enumerate(battle_sequence, start=1):
            print(f"\n>>> Executing {desc} ({dur}s)...")
            print(f"Prompt: {p}")
            await r.send_command("set_prompt", {"prompt": p})
            await asyncio.sleep(dur)

        print(f"\nBattle gameplay complete! Total frames streamed: {frame_idx}")

        try:
            print(f"Downloading master recording to {DEMO_MP4}...")
            await r.download_recording(path=DEMO_MP4)
            print(f"Saved master recording to {DEMO_MP4}")
        except Exception as dl_err:
            print(f"Download notice: {dl_err}")

    except Exception as e:
        print(f"Error during demo playthrough: {e}")
        traceback.print_exc()
    finally:
        r.close()
        print("Reactor session closed.")

    # Compile with ffmpeg if needed
    if not os.path.exists(DEMO_MP4) or os.path.getsize(DEMO_MP4) < 100000:
        if frame_idx > 0:
            print(f"Compiling {frame_idx} frames with ffmpeg...")
            cmd = [
                "/opt/homebrew/bin/ffmpeg", "-y",
                "-framerate", "18",
                "-i", os.path.join(FRAMES_DIR, "frame_%05d.jpg"),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                DEMO_MP4
            ]
            res = subprocess.run(cmd, capture_output=True, text=True)
            print(f"ffmpeg result: {res.returncode}")

    # Extract keyframes for Quality Check inspection
    print("Extracting keyframes for quality check...")
    cuts = [
        ("turn1_hold_position.png", 3),
        ("turn2_thunderbolt.png", 11),
        ("turn3_hold_position.png", 18),
        ("turn4_flamethrower.png", 26),
        ("turn5_quick_attack.png", 35),
        ("turn6_fainted.png", 42)
    ]
    for name, sec in cuts:
        out_png = os.path.join(QC_DIR, name)
        cmd = [
            "/opt/homebrew/bin/ffmpeg", "-y",
            "-ss", str(sec),
            "-i", DEMO_MP4,
            "-vframes", "1",
            out_png
        ]
        subprocess.run(cmd, capture_output=True)
        print(f"Extracted QC frame: {name} at {sec}s")

if __name__ == "__main__":
    asyncio.run(main())
