"""osm_poi.lua'nin metnini kaba parse eder; Lua calistirmadan ucuz bir koruma."""
import pathlib
import re

import catmap

LUA = (pathlib.Path(__file__).resolve().parent.parent / "osm_poi.lua").read_text(encoding="utf-8")


def _lua_table_values(key: str) -> set[str]:
    m = re.search(rf"\b{re.escape(key)}\s*=\s*\{{([^}}]*)\}}", LUA)
    if not m:
        return set()
    return set(re.findall(r"(\w+)\s*=\s*true", m.group(1)))


def test_lua_wanted_tags_cover_every_category_map_osm_pair():
    for atype, entry in catmap.load().items():
        for pair in entry["osm"]:
            key, _, value = pair.partition("=")
            assert value in _lua_table_values(key), f"{pair} osm_poi.lua'da yok ({atype})"
