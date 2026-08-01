#!/usr/bin/env python3
"""Serve the generated dist artifact briefly and smoke its static routes."""

from __future__ import annotations

import argparse
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
SMOKE_SCRIPT = ROOT / "tools" / "smoke_static_routes.py"


def available_loopback_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def wait_for_server(base_url: str, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(f"{base_url}/", timeout=1) as response:
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.1)
    raise TimeoutError(f"Timed out waiting {timeout:g}s for {base_url}.")


def stop_process_tree(server: subprocess.Popen[object]) -> None:
    if server.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ("taskkill", "/PID", str(server.pid), "/T", "/F"),
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        os.killpg(server.pid, signal.SIGTERM)
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        if os.name == "nt":
            server.kill()
        else:
            os.killpg(server.pid, signal.SIGKILL)
        server.wait()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--readiness-timeout", type=float, default=10)
    parser.add_argument("--smoke-timeout", type=float, default=60)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not DIST.is_dir():
        print("dist/ does not exist. Run npm run build first.", file=sys.stderr)
        return 1

    port = available_loopback_port()
    base_url = f"http://127.0.0.1:{port}"
    popen_kwargs: dict[str, object] = {}
    if os.name == "nt":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs["start_new_session"] = True

    server = subprocess.Popen(
        (
            sys.executable,
            "-m",
            "http.server",
            str(port),
            "--bind",
            "127.0.0.1",
            "--directory",
            str(DIST),
        ),
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        **popen_kwargs,
    )
    try:
        wait_for_server(base_url, args.readiness_timeout)
        result = subprocess.run(
            (sys.executable, str(SMOKE_SCRIPT), "--base-url", base_url),
            cwd=ROOT,
            timeout=args.smoke_timeout,
            check=False,
        )
        return int(result.returncode)
    except (subprocess.TimeoutExpired, TimeoutError) as error:
        print(error, file=sys.stderr)
        return 1
    finally:
        stop_process_tree(server)


if __name__ == "__main__":
    raise SystemExit(main())
