import pathlib

import yaml

import catmap

OPEN_YML = (pathlib.Path(__file__).resolve().parent.parent.parent.parent
            / "backend/src/main/resources/venue-sources/open.yml")


def test_every_type_has_overture_slug_and_mirrors_backend_open_yml():
    m = catmap.load()

    for atype, entry in m.items():
        assert entry["overture"], f"{atype}: en az bir Overture slug'i olmali"

    # backend/.../open.yml (B-13) her ActivityType icin tek karisik liste tasir; "=" iceren
    # girdiler OSM cifti, digerleri Overture slug'i. category_map.yml bunun ayrilmis halidir —
    # ikisi ortak tanimladigi her anahtarda ayni kumeye karsilik gelmeli.
    open_raw = yaml.safe_load(OPEN_YML.read_text(encoding="utf-8"))["categories"]

    shared_keys = set(m) & set(open_raw)
    assert shared_keys, "open.yml ve category_map.yml ortak hicbir ActivityType tasimiyor"

    for atype in shared_keys:
        expected_overture = {v for v in open_raw[atype] if "=" not in v}
        expected_osm = {v for v in open_raw[atype] if "=" in v}
        assert set(m[atype]["overture"]) == expected_overture, atype
        assert set(m[atype]["osm"]) == expected_osm, atype
