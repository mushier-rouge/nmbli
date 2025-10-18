from etl.normalize import normalize_make_name, normalized_key, clean_trim_name


def test_make_aliases():
    assert normalize_make_name("Mercedes Benz") == "Mercedes-Benz"
    assert normalize_make_name("VW") == "Volkswagen"
    assert normalize_make_name("Mini") == "MINI"


def test_normalized_key():
    assert normalized_key("Camry XSE") == "camry xse"
    assert normalized_key("Camry-XSE") == "camry xse"


def test_clean_trim_name_removes_duplicate_drive():
    assert clean_trim_name("LE AWD AWD") == "LE AWD"
    assert clean_trim_name("LE FWD") == "LE FWD"

