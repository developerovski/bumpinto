import pytest

from db import dsn_from_jdbc


def test_dsn_from_jdbc_default_port_query_param_and_non_jdbc_rejection():
    # varsayilan port: host'ta ":" yoksa 5432 eklenir, sorgu parametresi tasinir
    dsn = dsn_from_jdbc("jdbc:postgresql://pg/bumpinto?sslmode=require", "u", "p")
    assert dsn == "postgresql://u:p@pg:5432/bumpinto?sslmode=require"

    # jdbc: onekiyle baslamayan URL kabul edilmez
    with pytest.raises(ValueError):
        dsn_from_jdbc("postgresql://pg/db", "u", "p")
