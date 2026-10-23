from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class Incident(SQLModel, table=True):
    __tablename__ = "incidents"

    id: int | None = Field(
        default=None,
        primary_key=True,
    )

    location_id: str

    category: str

    description: str

    reporter_id: str

    status: str

    satisfaction_score: float | None = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )


class Ingredient(SQLModel, table=True):
    __tablename__ = "ingredients"

    id: int | None = Field(
        default=None,
        primary_key=True,
    )

    name: str

    sku: str = Field(
        unique=True,
        index=True,
    )

    unit: str

    category: str

    country: str


class IngredientEntry(SQLModel, table=True):
    __tablename__ = "ingredient_entries"

    id: int | None = Field(
        default=None,
        primary_key=True,
    )

    ingredient_id: int = Field(
        foreign_key="ingredients.id",
    )

    quantity: float

    supplier_name: str

    location_id: int

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    user_uuid: str


class IngredientExit(SQLModel, table=True):
    __tablename__ = "ingredient_exits"

    id: int | None = Field(
        default=None,
        primary_key=True,
    )

    ingredient_id: int = Field(
        foreign_key="ingredients.id",
    )

    quantity: float

    reason: str

    location_id: int

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    user_uuid: str