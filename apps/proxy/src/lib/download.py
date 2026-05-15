from pathlib import Path
from urllib import request


def download_media(url: str, dest: Path) -> bool:
    """Download url to dest, skipping if already on disk. Returns True on success or skip."""
    if dest.exists():
        return True
    try:
        with request.urlopen(url) as res:
            dest.write_bytes(res.read())
        return True
    except Exception as exc:
        print(f"  [err] {dest.name}: {exc}")
        return False
