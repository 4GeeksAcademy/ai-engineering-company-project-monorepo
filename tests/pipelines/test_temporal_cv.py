import numpy as np
from sklearn.model_selection import TimeSeriesSplit

from pipelines.train_sales_model import _features, load_sales, split_by_year


def test_temporal_cv_preserves_chronological_order_and_training_only():
    train, test = split_by_year(load_sales())
    x_train = _features(train)
    splitter = TimeSeriesSplit(n_splits=5)

    assert len(x_train) == 96
    assert train["month"].max() < test["month"].min()

    previous_validation_max = -1
    for train_idx, validation_idx in splitter.split(x_train):
        assert max(train_idx) < min(validation_idx)
        assert list(train_idx) == sorted(train_idx)
        assert list(validation_idx) == sorted(validation_idx)
        assert min(validation_idx) > previous_validation_max
        previous_validation_max = max(validation_idx)
        assert np.all(train_idx < len(x_train))
        assert np.all(validation_idx < len(x_train))
