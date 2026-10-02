from __future__ import annotations

import builtins

import pytest

from incidents_analysis import InvalidFormatError, analyze_file


def test_analyze_file_maps_oserror_to_safe_message(monkeypatch):
    def fail_open(*_args, **_kwargs):
        raise OSError("/private/patient/data.csv: permission denied")

    monkeypatch.setattr(builtins, "open", fail_open)

    with pytest.raises(InvalidFormatError, match="^The specified CSV file could not be read\\.$"):
        analyze_file("sensitive-input.csv")