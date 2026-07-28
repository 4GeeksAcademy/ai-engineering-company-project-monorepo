"""
supplier_models.py — Modelos Pydantic para el Directorio de Proveedores de TrackFlow

¿Por qué Pydantic?
------------------
FastAPI usa Pydantic para validar automáticamente cada petición que llega.
Si el dato no cumple las reglas definidas aquí, FastAPI devuelve un 422
ANTES de que el dato llegue a TinyDB. Tú no escribes ningún if de validación.

¿Por qué dos modelos (SupplierCreate y Supplier)?
--------------------------------------------------
- SupplierCreate: lo que envía el cliente (sin id ni updated_at — esos los genera el servidor)
- Supplier: lo que devuelve la API (incluye id asignado por TinyDB y updated_at del sistema)
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


# ─────────────────────────────────────────────────────────────
# ENUMS — valores permitidos exactos según CONTEXT-trackflow.md
# ─────────────────────────────────────────────────────────────

class SupplierStatus(str, Enum):
    """
    ¿Por qué Enum y no un str normal?
    Con Enum, Python literalmente no puede aceptar otro valor.
    Si el cliente envía "borrado" o "ACTIVE" (con mayúscula), Pydantic
    lo rechaza con 422. Con un str libre, tendrías que validarlo a mano.
    """
    active = "active"
    suspended = "suspended"


class Category(str, Enum):
    """
    Las 8 categorías válidas definidas en el CONTEXT de TrackFlow.
    Cualquier otra cadena → 422 automático.
    """
    carrier_last_mile = "carrier_last_mile"
    carrier_international = "carrier_international"
    warehouse_supplies = "warehouse_supplies"
    packaging_materials = "packaging_materials"
    reverse_logistics = "reverse_logistics"
    fleet_maintenance = "fleet_maintenance"
    it_and_wms_software = "it_and_wms_software"
    cleaning_and_facilities = "cleaning_and_facilities"


class Country(str, Enum):
    """Solo operamos en USA y Spain según el CONTEXT."""
    USA = "USA"
    Spain = "Spain"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"


# ─────────────────────────────────────────────────────────────
# MODELO DE ENTRADA — lo que envía el cliente en POST /suppliers
# ─────────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    """
    Campos que el cliente debe enviar al registrar un proveedor.
    updated_at e id NO están aquí — los genera el servidor.
    """
    name: str = Field(..., min_length=1, description="Nombre comercial del proveedor")
    country: Country = Field(..., description="País del contrato: USA o Spain")
    categories: list[Category] = Field(
        ...,
        min_length=1,
        description="Tipo de servicio (mínimo 1 categoría válida)"
    )
    rate_per_shipment: float = Field(
        ...,
        gt=0,  # gt = "greater than" → rechaza 0 y negativos con 422
        description="Tarifa por envío. Debe ser mayor que 0."
    )
    currency: Currency = Field(..., description="USD para USA, EUR para Spain")
    status: SupplierStatus = Field(
        default=SupplierStatus.active,
        description="active o suspended"
    )
    # Campos opcionales
    service_zone: Optional[str] = Field(None, description="Zona de cobertura")
    contact_email: Optional[str] = Field(None, description="Email de contacto")
    notes: Optional[str] = Field(None, description="Observaciones del equipo")

    @model_validator(mode="after")
    def validate_currency_matches_country(self) -> "SupplierCreate":
        """
        Regla de negocio TrackFlow:
        - USA  → debe usar USD
        - Spain → debe usar EUR
        Si no coinciden, Pydantic lanza 422 antes de tocar la base de datos.

        ¿Por qué un model_validator y no validar en el endpoint?
        Porque la regla es parte del modelo de datos, no del endpoint.
        Si en el futuro añades otro endpoint que crea proveedores,
        la validación ya está incluida — no tienes que recordar añadirla.
        """
        country_currency_map = {
            Country.USA: Currency.USD,
            Country.Spain: Currency.EUR,
        }
        expected = country_currency_map.get(self.country)
        if expected and self.currency != expected:
            raise ValueError(
                f"Un proveedor de '{self.country}' debe usar '{expected.value}', "
                f"no '{self.currency.value}'."
            )
        return self


# ─────────────────────────────────────────────────────────────
# MODELO DE RESPUESTA — lo que devuelve la API
# ─────────────────────────────────────────────────────────────

class Supplier(SupplierCreate):
    """
    Extiende SupplierCreate añadiendo los campos que genera el servidor.
    El cliente los recibe en la respuesta pero nunca los envía.
    """
    id: int = Field(..., description="ID asignado por TinyDB")
    updated_at: datetime = Field(
        ...,
        description="Timestamp de la última actualización de tarifa (generado por el sistema)"
    )


# ─────────────────────────────────────────────────────────────
# MODELOS PARA OPERACIONES PATCH
# ─────────────────────────────────────────────────────────────

class RateUpdate(BaseModel):
    """
    Payload para PATCH /suppliers/{id}/rate
    Solo acepta la nueva tarifa. updated_at se genera en el servidor.
    """
    rate_per_shipment: float = Field(
        ...,
        gt=0,
        description="Nueva tarifa. Debe ser mayor que 0."
    )


class StatusUpdate(BaseModel):
    """
    Payload para PATCH /suppliers/{id}/status
    Solo acepta 'active' o 'suspended' — el Enum hace la validación.
    """
    status: SupplierStatus