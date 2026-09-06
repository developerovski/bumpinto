import pytest

import wikidata_photos as wp


def test_chunks_of_fifty():
    ids = [f"Q{i}" for i in range(120)]
    parts = list(wp.chunks(ids, 50))
    assert [len(p) for p in parts] == [50, 50, 20]


def test_photo_urls_builds_commons_filepath():
    payload = {"entities": {"Q1815688": {"claims": {"P18": [
        {"mainsnak": {"datavalue": {"value": "Van Abbemuseum 01.jpg"}}}]}}}}
    assert wp.photo_urls(payload) == {
        "Q1815688":
        "https://commons.wikimedia.org/wiki/Special:FilePath/Van%20Abbemuseum%2001.jpg?width=1000"
    }


def test_photo_urls_skips_entities_without_p18():
    payload = {"entities": {"Q1": {"claims": {}}, "Q2": {"missing": ""}}}
    assert wp.photo_urls(payload) == {}


def test_user_agent_carries_contact(monkeypatch):
    monkeypatch.setenv("NOMINATIM_CONTACT", "sen@ornek.com")
    assert "sen@ornek.com" in wp.user_agent()


def test_user_agent_requires_contact(monkeypatch):
    monkeypatch.delenv("NOMINATIM_CONTACT", raising=False)
    with pytest.raises(RuntimeError):
        wp.user_agent()
