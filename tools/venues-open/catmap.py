"""category_map.yml yukleyici. Overture slug -> tur, OSM etiket cifti -> tur."""
from __future__ import annotations

import functools
import pathlib

import yaml

PATH = pathlib.Path(__file__).with_name("category_map.yml")


@functools.lru_cache(maxsize=1)
def load(path: pathlib.Path | None = None) -> dict[str, dict[str, list[str]]]:
    raw = yaml.safe_load((path or PATH).read_text(encoding="utf-8"))
    return {t: {"overture": e.get("overture") or [], "osm": e.get("osm") or []}
            for t, e in raw.items()}


def overture_index() -> dict[str, list[str]]:
    idx: dict[str, list[str]] = {}
    for atype, entry in load().items():
        for slug in entry["overture"]:
            idx.setdefault(slug, []).append(atype)
    return idx


def osm_pairs() -> list[tuple[str, str, str]]:
    out = []
    for atype, entry in load().items():
        for pair in entry["osm"]:
            key, _, value = pair.partition("=")
            out.append((key, value, atype))
    return out
