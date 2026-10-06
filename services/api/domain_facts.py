"""Location clock and the same illustrative FX rate the sales tickets already use."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

# Matches services.api.sales.ILLUSTRATIVE_USD_COP (1 USD = 4000 COP). Not a live feed.
ILLUSTRATIVE_USD_COP = 4000


def timezone_for(country: str) -> str:
    if country == "Colombia":
        return "America/Bogota"
    if country == "United States":
        return "America/New_York"
    raise ValueError(f"Unsupported country {country}")


def business_date(moment: datetime, country: str) -> str:
    return moment.astimezone(ZoneInfo(timezone_for(country))).date().isoformat()


def fx_recorded(amount: float, currency: str) -> dict[str, float | str]:
    if currency == "USD":
        return {
            "fx_status": "recorded",
            "fx_rate_usd_per_local": 1.0,
            "amount_usd": round(float(amount), 2),
        }
    rate = 1 / ILLUSTRATIVE_USD_COP
    return {
        "fx_status": "recorded",
        "fx_rate_usd_per_local": rate,
        "amount_usd": round(float(amount) * rate, 2),
    }
