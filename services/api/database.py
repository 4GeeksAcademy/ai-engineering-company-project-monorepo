"""
database.py — Inicialización de TinyDB

¿Qué es TinyDB?
---------------
TinyDB es una base de datos que guarda todo en un archivo JSON local.
No necesitas instalar nada extra (MySQL, Postgres, etc.).
Los datos persisten entre reinicios del servidor porque viven en db.json.

¿Por qué un módulo separado?
-----------------------------
Si en el futuro migramos a PostgreSQL (como dice el tech lead Andrés Kim),
solo cambiamos este archivo — todos los endpoints siguen funcionando igual.
Es el principio de "separación de responsabilidades".

Estructura del db.json que genera TinyDB:
{
  "suppliers": {
    "1": { "name": "UPS Ground", "country": "USA", ... },
    "2": { "name": "FedEx Ground", "country": "USA", ... }
  }
}
"""

from tinydb import TinyDB, Query

# La base de datos se guarda en services/api/db.json
# TinyDB crea el archivo automáticamente si no existe
db = TinyDB("db.json")

# Una "table" en TinyDB es como una hoja en Excel
# Todos nuestros proveedores van en esta tabla
suppliers_table = db.table("suppliers")

# Query es un helper de TinyDB para hacer búsquedas
# Lo usaremos así: suppliers_table.search(Supplier.country == "USA")
Supplier = Query()
