import sys
from decimal import Decimal
from typing import Any, Callable

from fastapi.testclient import TestClient

from main import app
from storage import inventory as storage


def assert_status(response: Any, expected: int) -> None:
    if response.status_code != expected:
        raise AssertionError(
            f"Esperaba HTTP {expected}, recibí {response.status_code}: {response.text}"
        )


def movement_payload(article_id: str, local_id: str, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "articulo_id": article_id,
        "local": local_id,
        "tipo": "entrada",
        "cantidad": 4.5,
        "autor": "verify-inventory",
        "fecha": "2026-09-25T12:00:00",
    }
    payload.update(overrides)
    return payload


def run_verification(client: TestClient) -> tuple[list[str], list[str]]:
    storage.articulos.clear()
    storage.locales.clear()
    storage.movimientos.clear()

    passed: list[str] = []
    failed: list[str] = []
    state: dict[str, str] = {}

    def run_stage(name: str, operation: Callable[[], None]) -> None:
        try:
            operation()
        except Exception as error:
            failed.append(name)
            print(f"FALLO: {name}: {type(error).__name__}: {error}")
        else:
            passed.append(name)
            print(f"OK: {name}")

    def require_state(key: str) -> str:
        value = state.get(key)
        if value is None:
            raise AssertionError(f"Falta el dato de estado requerido: {key}")
        return value

    def assert_inventory_unchanged(
        article_id: str,
        stock_before: dict[str, Any],
        history_before: list[dict[str, Any]],
        context: str,
    ) -> None:
        if get_stock(article_id) != stock_before:
            raise AssertionError(f"El stock cambió tras el rechazo: {context}")
        if get_history(article_id) != history_before:
            raise AssertionError(f"El historial cambió tras el rechazo: {context}")

    def get_stock(article_id: str) -> dict[str, Any]:
        response = client.get(
            "/inventory/stock",
            params={"articulo_id": article_id, "local": require_state("local_id")},
        )
        assert_status(response, 200)
        return response.json()

    def get_history(article_id: str) -> list[dict[str, Any]]:
        response = client.get(
            "/inventory/movements",
            params={"articulo_id": article_id, "local": require_state("local_id")},
        )
        assert_status(response, 200)
        return response.json()

    def get_articles() -> list[dict[str, Any]]:
        response = client.get("/inventory/articles")
        assert_status(response, 200)
        return response.json()

    def assert_article_rejection_is_non_mutating(
        payload: dict[str, Any],
        context: str,
    ) -> None:
        article_id = require_state("article_id")
        articles_before = get_articles()
        stock_before = get_stock(article_id)
        history_before = get_history(article_id)
        response = client.post("/inventory/articles", json=payload)
        assert_status(response, 422)
        if get_articles() != articles_before:
            raise AssertionError(f"El catálogo cambió tras el rechazo: {context}")
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            context,
        )

    def create_local() -> None:
        response = client.post(
            "/inventory/locals",
            json={"nombre": "Local Central"},
        )
        assert_status(response, 201)
        local = response.json()
        if not local.get("id"):
            raise AssertionError("La respuesta no contiene id de local")
        state["local_id"] = local["id"]

    run_stage("crear local válido (201)", create_local)

    def create_article() -> None:
        response = client.post(
            "/inventory/articles",
            json={
                "nombre": "Artículo de verificación",
                "categoria": "verduras",
                "unidad_medida": "kg",
                "punto_reorden": "5",
            },
        )
        assert_status(response, 201)
        article = response.json()
        if not article.get("id"):
            raise AssertionError("La respuesta no contiene id de artículo")
        state["article_id"] = article["id"]

    run_stage("crear artículo válido (201)", create_article)

    def check_initial_stock() -> None:
        stock = get_stock(require_state("article_id"))
        if Decimal(str(stock["stock"])) != Decimal("0"):
            raise AssertionError(f"Se esperaba stock 0, recibí {stock['stock']}")

    run_stage("consultar stock inicial en cero (200)", check_initial_stock)

    def check_initial_reorder_point() -> None:
        stock = get_stock(require_state("article_id"))
        if Decimal(str(stock["punto_reorden"])) != Decimal("5"):
            raise AssertionError(
                f"Se esperaba punto_reorden 5, recibí {stock['punto_reorden']}"
            )
        if stock["bajo_punto_reorden"] is not True:
            raise AssertionError("Con stock inicial cero se esperaba bajo_punto_reorden true")

    run_stage("señalar punto de reorden con stock inicial cero (200)", check_initial_reorder_point)

    def create_entry() -> None:
        article_id = require_state("article_id")
        response = client.post(
            "/inventory/movements",
            json=movement_payload(article_id, require_state("local_id")),
        )
        assert_status(response, 201)
        movement = response.json()
        if not movement.get("id"):
            raise AssertionError("La respuesta no contiene id de movimiento")
        state["movement_id"] = movement["id"]
        stock = get_stock(article_id)
        if Decimal(str(stock["stock"])) != Decimal("4.5"):
            raise AssertionError(f"Se esperaba stock 4.5, recibí {stock['stock']}")

    run_stage("registrar entrada y reflejar stock (201)", create_entry)

    def check_below_reorder_point_after_entry() -> None:
        stock = get_stock(require_state("article_id"))
        if Decimal(str(stock["stock"])) != Decimal("4.5"):
            raise AssertionError(f"Se esperaba stock 4.5, recibí {stock['stock']}")
        if stock["bajo_punto_reorden"] is not True:
            raise AssertionError("Con stock 4.5 se esperaba bajo_punto_reorden true")

    run_stage("mantener señal bajo punto de reorden con stock 4.5 (200)", check_below_reorder_point_after_entry)

    def create_entry_above_reorder_point() -> None:
        response = client.post(
            "/inventory/movements",
            json=movement_payload(
                require_state("article_id"),
                require_state("local_id"),
                cantidad=2,
            ),
        )
        assert_status(response, 201)
        stock = get_stock(require_state("article_id"))
        if Decimal(str(stock["stock"])) != Decimal("6.5"):
            raise AssertionError(f"Se esperaba stock 6.5, recibí {stock['stock']}")
        if stock["bajo_punto_reorden"] is not False:
            raise AssertionError("Con stock 6.5 se esperaba bajo_punto_reorden false")

    run_stage("superar punto de reorden y retirar señal (201)", create_entry_above_reorder_point)

    def reject_article_without_reorder_point() -> None:
        assert_article_rejection_is_non_mutating(
            {
                "nombre": "Artículo sin punto de reorden",
                "categoria": "verduras",
                "unidad_medida": "kg",
            },
            "punto_reorden ausente",
        )

    run_stage("rechazar artículo sin punto de reorden (422)", reject_article_without_reorder_point)

    def reject_article_with_negative_reorder_point() -> None:
        assert_article_rejection_is_non_mutating(
            {
                "nombre": "Artículo con punto de reorden negativo",
                "categoria": "verduras",
                "unidad_medida": "kg",
                "punto_reorden": "-1",
            },
            "punto_reorden negativo",
        )

    run_stage("rechazar artículo con punto de reorden negativo (422)", reject_article_with_negative_reorder_point)

    def reject_negative_exit_without_mutation() -> None:
        article_id = require_state("article_id")
        stock_before = get_stock(article_id)
        history_before = get_history(article_id)
        response = client.post(
            "/inventory/movements",
            json=movement_payload(
                article_id,
                require_state("local_id"),
                tipo="salida",
                cantidad=7,
            ),
        )
        assert_status(response, 409)
        stock_after = get_stock(article_id)
        history_after = get_history(article_id)
        if stock_after != stock_before or history_after != history_before:
            raise AssertionError("Stock o historial cambió tras rechazar la salida negativa")

    run_stage("rechazar salida con stock negativo sin mutación (409)", reject_negative_exit_without_mutation)

    def reject_unknown_article() -> None:
        article_id = require_state("article_id")
        stock_before = get_stock(article_id)
        history_before = get_history(article_id)
        response = client.post(
            "/inventory/movements",
            json=movement_payload(
                "missing-inventory-article",
                require_state("local_id"),
            ),
        )
        assert_status(response, 404)
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            "artículo inexistente",
        )

    run_stage("rechazar artículo inexistente (404)", reject_unknown_article)

    def reject_incomplete_movements() -> None:
        article_id = require_state("article_id")
        local_id = require_state("local_id")
        stock_before = get_stock(article_id)
        history_before = get_history(article_id)
        missing_quantity = movement_payload(article_id, local_id)
        del missing_quantity["cantidad"]
        assert_status(
            client.post("/inventory/movements", json=missing_quantity),
            422,
        )
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            "cantidad ausente",
        )

        missing_author = movement_payload(article_id, local_id)
        del missing_author["autor"]
        assert_status(
            client.post("/inventory/movements", json=missing_author),
            422,
        )
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            "autor ausente",
        )

    run_stage("rechazar cantidad o autor ausentes (422)", reject_incomplete_movements)

    def reject_movement_mutations() -> None:
        article_id = require_state("article_id")
        movement_id = require_state("movement_id")
        movement_url = f"/inventory/movements/{movement_id}"
        movement_before_response = client.get(movement_url)
        assert_status(movement_before_response, 200)
        movement_before = movement_before_response.json()
        stock_before = get_stock(article_id)
        history_before = get_history(article_id)

        assert_status(client.patch(movement_url, json={"motivo": "modificado"}), 405)
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            "PATCH no permitido",
        )
        assert_status(client.delete(movement_url), 405)
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            "DELETE no permitido",
        )

        movement_after_response = client.get(movement_url)
        assert_status(movement_after_response, 200)
        if movement_after_response.json() != movement_before:
            raise AssertionError("El movimiento cambió tras rechazar su modificación")
        if get_stock(article_id) != stock_before:
            raise AssertionError("El stock cambió tras rechazar la mutación")
        if get_history(article_id) != history_before:
            raise AssertionError("El historial cambió tras rechazar la mutación")

    run_stage("rechazar PATCH/DELETE y conservar movimiento (405)", reject_movement_mutations)

    def reject_invalid_category() -> None:
        article_id = require_state("article_id")
        stock_before = get_stock(article_id)
        history_before = get_history(article_id)
        response = client.post(
            "/inventory/articles",
            json={
                "nombre": "Artículo inválido",
                "categoria": "frutas",
                "unidad_medida": "kg",
                "punto_reorden": "5",
            },
        )
        assert_status(response, 422)
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            "categoría inválida",
        )

    run_stage("rechazar categoría inválida (422)", reject_invalid_category)

    def reject_invalid_unit() -> None:
        article_id = require_state("article_id")
        stock_before = get_stock(article_id)
        history_before = get_history(article_id)
        response = client.post(
            "/inventory/articles",
            json={
                "nombre": "Artículo con unidad inválida",
                "categoria": "verduras",
                "unidad_medida": "kilogramo",
                "punto_reorden": "5",
            },
        )
        assert_status(response, 422)
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            "unidad inválida",
        )

    run_stage("rechazar unidad fuera del catálogo (422)", reject_invalid_unit)

    def reject_unknown_local() -> None:
        article_id = require_state("article_id")
        stock_before = get_stock(article_id)
        history_before = get_history(article_id)
        missing_local = "missing-inventory-local"
        response = client.post(
            "/inventory/movements",
            json=movement_payload(article_id, missing_local),
        )
        assert_status(response, 404)
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            "local inexistente en registro",
        )

        stock_response = client.get(
            "/inventory/stock",
            params={"articulo_id": article_id, "local": missing_local},
        )
        assert_status(stock_response, 404)
        assert_inventory_unchanged(
            article_id,
            stock_before,
            history_before,
            "local inexistente en consulta de stock",
        )

    run_stage("rechazar local inexistente en POST y stock (404)", reject_unknown_local)

    return passed, failed


def main() -> int:
    with TestClient(app) as client:
        passed, failed = run_verification(client)

    total = len(passed) + len(failed)
    print("\nResumen de verificación")
    print(f"- Etapas totales: {total}")
    print(f"- Etapas superadas: {len(passed)}")
    print(f"- Etapas fallidas: {len(failed)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())