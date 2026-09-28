import unittest
from datetime import datetime
from decimal import Decimal

from pydantic import ValidationError

from models.inventory import (
    Articulo,
    ArticuloCreate,
    CategoriaArticulo,
    Local,
    LocalCreate,
    Movimiento,
    MovimientoCreate,
    TipoMovimiento,
    UnidadMedida,
)


class InventoryModelTests(unittest.TestCase):
    def test_article_accepts_all_categories_and_units(self) -> None:
        for category in CategoriaArticulo:
            with self.subTest(category=category):
                article = ArticuloCreate(
                    nombre="Tomate",
                    categoria=category,
                    unidad_medida=UnidadMedida.KG,
                    punto_reorden=Decimal("5.5"),
                )
                self.assertEqual(article.categoria, category)

        for unit in UnidadMedida:
            with self.subTest(unit=unit):
                article = ArticuloCreate(
                    nombre="Tomate",
                    categoria=CategoriaArticulo.VERDURAS,
                    unidad_medida=unit,
                    punto_reorden=Decimal("5.5"),
                )
                self.assertEqual(article.unidad_medida, unit)

    def test_article_accepts_non_negative_reorder_point(self) -> None:
        for reorder_point in (Decimal("0"), Decimal("5.5")):
            with self.subTest(reorder_point=reorder_point):
                article = ArticuloCreate(
                    nombre="Tomate",
                    categoria=CategoriaArticulo.VERDURAS,
                    unidad_medida=UnidadMedida.KG,
                    punto_reorden=reorder_point,
                )
                self.assertEqual(article.punto_reorden, reorder_point)

        persisted_article = Articulo(
            id="article-1",
            nombre="Tomate",
            categoria=CategoriaArticulo.VERDURAS,
            unidad_medida=UnidadMedida.KG,
            punto_reorden=Decimal("5.5"),
        )
        self.assertEqual(persisted_article.punto_reorden, Decimal("5.5"))

    def test_persisted_article_requires_id(self) -> None:
        with self.assertRaises(ValidationError):
            Articulo(
                nombre="Tomate",
                categoria=CategoriaArticulo.VERDURAS,
                unidad_medida=UnidadMedida.KG,
                punto_reorden=Decimal("5.5"),
            )

    def test_article_rejects_invalid_category_and_empty_required_fields(self) -> None:
        with self.assertRaises(ValidationError):
            ArticuloCreate(
                nombre="Tomate",
                categoria="frutas",
                unidad_medida=UnidadMedida.KG,
                punto_reorden=Decimal("5.5"),
            )

        valid_payload = {
            "nombre": "Tomate",
            "categoria": CategoriaArticulo.VERDURAS,
            "unidad_medida": UnidadMedida.KG,
            "punto_reorden": Decimal("5.5"),
        }
        for field in ("nombre", "categoria", "unidad_medida", "punto_reorden"):
            with self.subTest(field=field):
                payload = valid_payload.copy()
                del payload[field]
                with self.assertRaises(ValidationError):
                    ArticuloCreate(**payload)

        with self.assertRaises(ValidationError):
            ArticuloCreate(
                nombre="   ",
                categoria=CategoriaArticulo.VERDURAS,
                unidad_medida=UnidadMedida.KG,
                punto_reorden=Decimal("5.5"),
            )

    def test_article_rejects_negative_or_non_numeric_reorder_point(self) -> None:
        for reorder_point in (Decimal("-0.1"), "not-a-number"):
            with self.subTest(reorder_point=reorder_point):
                with self.assertRaises(ValidationError):
                    ArticuloCreate(
                        nombre="Tomate",
                        categoria=CategoriaArticulo.VERDURAS,
                        unidad_medida=UnidadMedida.KG,
                        punto_reorden=reorder_point,
                    )

    def test_article_rejects_unit_outside_catalog(self) -> None:
        with self.assertRaises(ValidationError):
            ArticuloCreate(
                nombre="Tomate",
                categoria=CategoriaArticulo.VERDURAS,
                unidad_medida="lb",
                punto_reorden=Decimal("5.5"),
            )

    def test_local_create_accepts_non_empty_name(self) -> None:
        location = LocalCreate(nombre="Cocina Norte")

        self.assertEqual(location.nombre, "Cocina Norte")

    def test_local_create_rejects_missing_or_empty_name(self) -> None:
        with self.assertRaises(ValidationError):
            LocalCreate()

        with self.assertRaises(ValidationError):
            LocalCreate(nombre="   ")

    def test_persisted_local_requires_id(self) -> None:
        with self.assertRaises(ValidationError):
            Local(nombre="Cocina Norte")

    def test_movement_accepts_types_decimal_quantities_and_optional_reason(self) -> None:
        for movement_type, quantity in (
            (TipoMovimiento.ENTRADA, Decimal("2.75")),
            (TipoMovimiento.SALIDA, Decimal("1.25")),
            (TipoMovimiento.AJUSTE, Decimal("3.50")),
            (TipoMovimiento.AJUSTE, Decimal("-0.50")),
        ):
            with self.subTest(movement_type=movement_type, quantity=quantity):
                movement = MovimientoCreate(
                    articulo_id="article-1",
                    local="local-1",
                    tipo=movement_type,
                    cantidad=quantity,
                    autor="operador",
                    fecha=datetime(2026, 9, 25, 12, 0),
                )
                self.assertEqual(movement.cantidad, quantity)
                self.assertIsNone(movement.motivo)

        with_reason = self.valid_movement_payload(motivo="Inventario inicial")
        self.assertEqual(MovimientoCreate(**with_reason).motivo, "Inventario inicial")

    def test_persisted_movement_requires_id(self) -> None:
        with self.assertRaises(ValidationError):
            Movimiento(**self.valid_movement_payload())

    def test_movement_rejects_invalid_type_and_invalid_quantity_sign(self) -> None:
        with self.assertRaises(ValidationError):
            MovimientoCreate(**self.valid_movement_payload(tipo="transferencia"))

        for movement_type, quantity in (
            (TipoMovimiento.ENTRADA, Decimal("-1")),
            (TipoMovimiento.SALIDA, Decimal("0")),
            (TipoMovimiento.AJUSTE, Decimal("0")),
            (TipoMovimiento.ENTRADA, Decimal("NaN")),
            (TipoMovimiento.ENTRADA, Decimal("Infinity")),
        ):
            with self.subTest(movement_type=movement_type, quantity=quantity):
                with self.assertRaises(ValidationError):
                    MovimientoCreate(
                        **self.valid_movement_payload(
                            tipo=movement_type,
                            cantidad=quantity,
                        )
                    )

    def test_movement_requires_identifiers_type_quantity_author_and_date(self) -> None:
        valid_payload = self.valid_movement_payload()
        for field in ("articulo_id", "local", "tipo", "cantidad", "autor", "fecha"):
            with self.subTest(field=field):
                payload = valid_payload.copy()
                del payload[field]
                with self.assertRaises(ValidationError):
                    MovimientoCreate(**payload)

        for field in ("local", "autor"):
            with self.subTest(empty_field=field):
                payload = valid_payload.copy()
                payload[field] = "   "
                with self.assertRaises(ValidationError):
                    MovimientoCreate(**payload)

    @staticmethod
    def valid_movement_payload(**overrides: object) -> dict[str, object]:
        payload: dict[str, object] = {
            "articulo_id": "article-1",
            "local": "local-1",
            "tipo": TipoMovimiento.ENTRADA,
            "cantidad": Decimal("2.5"),
            "autor": "operador",
            "fecha": datetime(2026, 9, 25, 12, 0),
        }
        payload.update(overrides)
        return payload


if __name__ == "__main__":
    unittest.main()
