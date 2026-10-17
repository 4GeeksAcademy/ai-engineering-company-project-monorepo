from pipelines.train_sales_model import load_sales, split_by_year


def test_split_respects_8_2_rule_and_no_leakage():
    train, test = split_by_year(load_sales())
    train_years = set(train["month"].dt.year)
    test_years = set(test["month"].dt.year)

    assert len(test_years) == 2
    assert len(train_years) == 8
    assert train_years.isdisjoint(test_years)
    assert max(train_years) < min(test_years)
