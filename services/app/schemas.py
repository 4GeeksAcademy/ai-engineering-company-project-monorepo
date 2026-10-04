from typing import Literal

from pydantic import BaseModel, ConfigDict

CountryCode = Literal["CO", "US"]
CurrencyCode = Literal["COP", "USD"]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StoreSale(ContractModel):
    storeId: str
    storeName: str
    country: CountryCode
    currency: CurrencyCode
    orders: int
    revenue: float
    averageTicket: float


class InventoryRisk(ContractModel):
    storeId: str
    storeName: str
    ingredient: str
    availableUnits: float
    estimatedWeeklyDemand: float


class SupplierTrend(ContractModel):
    supplierName: str
    category: str
    priceChangePct: float


class HrKpi(ContractModel):
    country: CountryCode
    turnoverPct: float
    absenteeismPct: float
    daysToFillVacancy: float


class BrasalandBusinessInput(ContractModel):
    weekLabel: str
    sales: list[StoreSale]
    inventory: list[InventoryRisk]
    suppliers: list[SupplierTrend]
    hr: list[HrKpi]