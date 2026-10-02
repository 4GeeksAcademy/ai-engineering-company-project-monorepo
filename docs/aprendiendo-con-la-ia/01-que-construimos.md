# 1. Qué construimos

## El problema

Nexova contrata servicios externos: LinkedIn para publicar ofertas, Workable para gestionar candidatos, oficinas en Valencia y Miami, etc. A esos servicios les llamamos **proveedores**.

Patricia (la HR Manager) guardaba la lista en una **hoja de cálculo** y la mandaba por email cada vez que cambiaba algo. Resultado:

- Había varias versiones circulando y nadie sabía cuál era la buena.
- Nadie sabía cuándo había cambiado el precio de un proveedor.
- Podía entrar cualquier dato mal escrito (un país que no existe, un precio negativo).

## La solución

Construimos dos cosas que trabajan juntas:

1. **Un backend** (la API): un programa que guarda los proveedores y decide qué datos son válidos.
2. **Un frontend** (la página web): la pantalla donde Patricia ve, busca y cambia los proveedores.

Una comparación: piensa en un **restaurante**.

| En el restaurante | En nuestro proyecto |
|---|---|
| El comedor, con la carta y las mesas | El **frontend** (la página web) |
| La cocina | El **backend** (la API) |
| La despensa donde se guardan los ingredientes | La **base de datos** (TinyDB) |
| El camarero que lleva pedidos de un sitio a otro | Las **peticiones HTTP** |
| El jefe de cocina que rechaza un pedido imposible ("no tenemos ese plato") | La **validación** (Pydantic) |

El cliente nunca entra a la despensa. Pide al camarero, la cocina comprueba que el pedido tiene sentido y, solo entonces, toca los ingredientes.

## El viaje de un dato

Esto es lo que pasa cuando Patricia pulsa el botón "Suspender" en Greenhouse:

```
Navegador (la página)
   │  1. "Quiero cambiar el estado del proveedor 5 a suspended"
   ▼
Servidor de desarrollo (Vite)
   │  2. Reenvía la petición a la API (a esto se le llama "proxy")
   ▼
API (FastAPI)  ── services/api/routes/suppliers.py
   │  3. Pydantic revisa: ¿"suspended" es un estado permitido?
   │        no  → responde 422 y ahí termina, la base ni se entera
   │        sí  → sigue
   ▼
TinyDB ── services/api/db.json
   │  4. Guarda el cambio en el archivo
   ▼
La API responde 200 con el proveedor ya actualizado
   ▼
La página cambia el botón a rojo, sin recargar
```

## El mapa de carpetas

Solo se trabajó en dos carpetas del repositorio (el resto es de otros hitos del curso). La estructura es la que pide la entrega:

```
services/api/                    ← el BACKEND
├── main.py                      arranca la API y conecta las piezas
├── models.py                    los modelos Pydantic: las REGLAS de qué datos son válidos
├── database.py                  arranca TinyDB y guarda, busca y cambia datos
├── routes/
│   └── suppliers.py             las "puertas de entrada" (URLs) del directorio
├── seed.py                      carga los 15 proveedores iniciales (uv run seed)
├── pyproject.toml               permite ejecutar "uv run seed"
├── CONTEXT-suppliers.md         el encargo original (la "receta")
├── core/config.py               ajustes generales (dónde está la base de datos)
└── tests/                       pruebas automáticas

uis/application/                 ← el FRONTEND
├── app/
│   ├── main.tsx, App.tsx        arranque de la app y la cabecera
│   └── suppliers/               la página del directorio de proveedores
│       ├── page.tsx             la página completa
│       ├── SupplierRow.tsx      una fila de la tabla
│       ├── SupplierForm.tsx     el formulario de alta
│       ├── api.ts               funciones que hablan con la API
│       └── types.ts             los tipos de datos (los campos)
└── e2e/suppliers.e2e.mjs        prueba automática en un navegador real
```

`uis/backoffice/` sigue existiendo con otra herramienta (el análisis de incidentes); la página de proveedores se movió de allí a `uis/application/` para cumplir la estructura de entrega.

## Los números del resultado

- 15 proveedores cargados desde el primer arranque.
- 8 acciones posibles en la API (crear, listar, buscar, ver uno, cambiar tarifa, cambiar estado, editar y borrar).
- 42 pruebas automáticas del backend y 28 comprobaciones en navegador del frontend (en Chromium y en Firefox), todas en verde.
