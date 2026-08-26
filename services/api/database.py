"""
database.py — Inicialización de TinyDB

Ahora con 3 tablas:
- suppliers_table (YA EXISTE): datos de proveedores TrackFlow
- users_table (NUEVO): credenciales de usuario (email, password hasheado)
- profiles_table (NUEVO): datos de perfil (name, phone, address)
"""

from tinydb import TinyDB, Query

db = TinyDB("db.json")

suppliers_table = db.table("suppliers")
users_table = db.table("users")
profiles_table = db.table("profiles")

# Queries reutilizables
Supplier = Query()
User = Query()
Profile = Query()
