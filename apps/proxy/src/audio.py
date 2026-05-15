"""
mitmproxy addon: intercepts api.cosmo.fans/bff/v3/objekt-summaries responses
and downloads frontMedia for any collection where hasVoice=True.

Run:
    turbo proxy:audio
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from lib.download import download_media
from lib.slugify import slugify_objekt
from mitmproxy import http

_TARGET_HOST = "api.cosmo.fans"
_TARGET_PATH = "/bff/v3/objekt-summaries"
_OUTPUT_DIR = Path(__file__).parent.parent / "output" / "audio"


class AudioAddon:
    """Intercepts objekt-summaries responses and downloads audio-enabled collections."""

    def __init__(self) -> None:
        self._seen: set[str] = set()
        _OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    def response(self, flow: http.HTTPFlow) -> None:
        """On each matching response, download any unseen audio-enabled collections."""
        if flow.request.host != _TARGET_HOST:
            return
        if flow.request.path.split("?", 1)[0] != _TARGET_PATH:
            return
        if not flow.response or flow.response.status_code != 200:
            return

        try:
            body = json.loads(flow.response.get_text(strict=False) or "")
        except json.JSONDecodeError:
            return

        for item in body.get("collections", []):
            c = item.get("collection", {})
            collection_id: str | None = c.get("collectionId")
            front_media: str | None = c.get("frontMedia")
            has_voice: bool = c.get("hasVoice", False)

            if not collection_id or not front_media or not has_voice:
                continue
            if collection_id in self._seen:
                continue

            self._seen.add(collection_id)
            slug = slugify_objekt(collection_id)
            dest = _OUTPUT_DIR / f"{slug}.mp4"

            print(f"[audio] {slug}.mp4")
            ok = download_media(front_media, dest)
            print(f"[audio] {'ok  ' if ok else 'fail'} {dest.name}")


addons = [AudioAddon()]
