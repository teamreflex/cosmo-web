"""
mitmproxy addon: waits for the first Bearer-authenticated request to api.cosmo.fans,
then uses that token to fetch all Motion class objekt-summaries and download their
frontMedia for all artists (or a subset via --set artist=<name>).

Run:
    turbo proxy:motion
    turbo proxy:motion -- --set artist=tripleS
    turbo proxy:motion -- --set artist=tripleS,artms
"""

import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from lib.cosmo import ARTISTS, fetch_objekt_summaries
from lib.download import download_media
from lib.slugify import slugify_objekt
from mitmproxy import ctx, http

_TARGET_HOST = "api.cosmo.fans"
_OUTPUT_DIR = Path(__file__).parent.parent / "output" / "motion"


class MotionAddon:
    """Captures the first Bearer token seen, then fetches and downloads all Motion media."""

    def __init__(self) -> None:
        self._token: str | None = None

    def load(self, loader) -> None:
        """Register the --set artist= option for filtering which artists to fetch."""
        loader.add_option(
            name="artist",
            typespec=str,
            default="",
            help=f"Comma-separated artists to fetch. Default: all ({', '.join(ARTISTS)}).",
        )

    def _artists(self) -> tuple[str, ...]:
        """Return the active artist list, filtered by --set artist= if provided."""
        val = ctx.options.artist.strip()
        if not val:
            return ARTISTS
        return tuple(a.strip() for a in val.split(",") if a.strip() in ARTISTS)

    def request(self, flow: http.HTTPFlow) -> None:
        """On the first Bearer-authenticated request, kick off the Motion fetch in a thread."""
        if self._token is not None:
            return
        if flow.request.host != _TARGET_HOST:
            return

        auth = flow.request.headers.get("authorization", "")
        if not auth.lower().startswith("bearer "):
            return

        self._token = auth.split(" ", 1)[1].strip()
        print(f"[motion] captured token, starting fetch")
        threading.Thread(target=self._run, args=(self._token,), daemon=True).start()

    def _run(self, token: str) -> None:
        """Fetch Motion collections for the configured artists and download their frontMedia."""
        _OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        ok_count = 0
        fail_count = 0

        for artist in self._artists():
            print(f"[motion] fetching {artist}...")
            try:
                collections = fetch_objekt_summaries(token, artist, "Motion")
            except Exception as exc:
                print(f"[motion] {artist} failed: {exc}")
                continue

            for item in collections:
                c = item.get("collection", {})
                collection_id: str | None = c.get("collectionId")
                front_media: str | None = c.get("frontMedia")

                if not collection_id or not front_media:
                    continue

                slug = slugify_objekt(collection_id)
                dest = _OUTPUT_DIR / f"{slug}.mp4"
                ok = download_media(front_media, dest)
                print(f"[motion] {'ok  ' if ok else 'fail'} {dest.name}")
                if ok:
                    ok_count += 1
                else:
                    fail_count += 1

        print(f"[motion] done -- {ok_count} downloaded, {fail_count} failed")


addons = [MotionAddon()]
