import re
import unicodedata


def slugify_objekt(collection_id: str) -> str:
    """Mirror of slugifyObjekt from @apollo/util — lowercase, strip diacritics, spaces to hyphens."""
    s = collection_id.lower()
    s = unicodedata.normalize("NFD", s)
    s = re.sub("[̀-ͯ]", "", s)
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    return s
