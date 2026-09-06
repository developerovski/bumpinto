import coverage as cov


def test_summarize_counts_and_percent_with_low_flag():
    rows = [
        ("COFFEE", 10, 8),          # ticari, dusuk-kapsama bayragi kontrol edilmez
        ("MUSEUM", 10, 3),          # %30, MUSEUM icin dusuk kapsama bayragi beklenir
        ("BAR", 0, 0),              # sifira bolme korumasi (BAR bayrak listesinde degil)
    ]
    out = cov.summarize(rows)
    assert out[0] == ("COFFEE", 10, 8, 80.0, False)
    assert out[1] == ("MUSEUM", 10, 3, 30.0, True)
    assert out[2] == ("BAR", 0, 0, 0.0, False)
