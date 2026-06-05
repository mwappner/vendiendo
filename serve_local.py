#!/usr/bin/env python3
"""Build the manifest and serve the static site locally."""

from __future__ import annotations

import http.server
from functools import partial
import socketserver
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 8000


def build_manifest() -> None:
    subprocess.run(
        [sys.executable, str(ROOT / "build_manifest.py")],
        cwd=ROOT,
        check=True,
    )


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    build_manifest()

    class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self) -> None:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            super().end_headers()

    handler = partial(NoCacheHTTPRequestHandler, directory=ROOT)

    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    with ReusableTCPServer(("", port), handler) as server:
        print(f"Serving at http://localhost:{port}")
        print("Press Ctrl+C to stop.")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
