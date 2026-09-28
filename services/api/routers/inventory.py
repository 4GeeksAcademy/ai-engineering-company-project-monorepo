from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from models.inventory import (
	Articulo,
	ArticuloCreate,
	Local,
	LocalCreate,
	Movimiento,
	MovimientoCreate,
)
from storage import inventory as storage


router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("/locals", response_model=Local, status_code=201)
def create_local(payload: LocalCreate) -> Local:
	return storage.create_local(payload)


@router.get("/locals", response_model=list[Local])
def list_locals() -> list[Local]:
	return storage.list_locals()


@router.post("/articles", response_model=Articulo, status_code=201)
def create_article(payload: ArticuloCreate) -> Articulo:
	return storage.create_article(payload)


@router.get("/articles", response_model=list[Articulo])
def list_articles() -> list[Articulo]:
	return storage.list_articles()


def _find_article(article_id: str) -> Articulo:
	article = storage.find_article(article_id)
	if article is None:
		raise HTTPException(status_code=404, detail="Artículo no encontrado")
	return article


@router.get("/articles/{article_id}", response_model=Articulo)
def get_article(article_id: str) -> Articulo:
	return _find_article(article_id)


@router.post("/movements", response_model=Movimiento, status_code=201)
def create_movement(payload: MovimientoCreate) -> Movimiento:
	try:
		return storage.register_movement(payload)
	except storage.ArticleNotFoundError as error:
		raise HTTPException(status_code=404, detail=str(error)) from error
	except storage.LocalNotFoundError as error:
		raise HTTPException(status_code=404, detail=str(error)) from error
	except storage.NegativeStockError as error:
		raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/movements", response_model=list[Movimiento])
def list_movements(
	articulo_id: Optional[str] = None,
	local: Optional[str] = None,
) -> list[Movimiento]:
	if articulo_id is not None and storage.find_article(articulo_id) is None:
		raise HTTPException(status_code=404, detail="Artículo no encontrado")
	if local is not None and storage.find_local(local) is None:
		raise HTTPException(status_code=404, detail="Local no encontrado")
	return storage.list_movements(articulo_id=articulo_id, local=local)


@router.get("/movements/{movement_id}", response_model=Movimiento)
def get_movement(movement_id: str) -> Movimiento:
	movement = storage.find_movement(movement_id)
	if movement is None:
		raise HTTPException(status_code=404, detail="Movimiento no encontrado")
	return movement


@router.get("/stock")
def get_stock(
	articulo_id: str = Query(min_length=1),
	local: str = Query(min_length=1),
) -> dict[str, object]:
	article = _find_article(articulo_id)
	if storage.find_local(local) is None:
		raise HTTPException(status_code=404, detail="Local no encontrado")
	stock = storage.calculate_stock(article.id, local)
	return {
		"articulo_id": article.id,
		"local": local,
		"stock": stock,
		"unidad_medida": article.unidad_medida,
		"punto_reorden": article.punto_reorden,
		"bajo_punto_reorden": stock < article.punto_reorden,
	}
