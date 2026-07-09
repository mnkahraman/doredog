#!/usr/bin/env python3
"""Tiny static server for local preview (sandbox-safe: never calls os.getcwd)."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DIRECTORY = "/Users/nurettinkahraman/Documents/PYTHON/4_DOREDOG"
PORT = 4173


class NoCacheHandler(SimpleHTTPRequestHandler):
    """Disable caching so a plain browser reload always pulls fresh code during
    development — otherwise Safari can serve a cached HTML doc and never re-request
    the ?v= assets, which reads as 'my change didn't apply'."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


Handler = functools.partial(NoCacheHandler, directory=DIRECTORY)
httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
print(f"DoReDog serving {DIRECTORY} at http://127.0.0.1:{PORT}")
httpd.serve_forever()
