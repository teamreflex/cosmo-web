import json
from urllib import request, parse

ARTISTS = ("tripleS", "artms", "idntt")

_API_BASE = "https://api.cosmo.fans"


def fetch_objekt_summaries(token: str, artist_id: str, class_name: str) -> list[dict]:
    """Fetch objekt summaries for a given artist and class using a Bearer token."""
    qs = (
        f"artistId={parse.quote(artist_id)}"
        f"&class[]={parse.quote(class_name)}"
        f"&order=newest&page=1&size=100"
    )
    url = f"{_API_BASE}/bff/v3/objekt-summaries?{qs}"
    req = request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with request.urlopen(req) as res:
        data = json.loads(res.read())
    return data.get("collections", [])
