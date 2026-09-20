import sys
import os

# Asegurar que los paquetes compartidos y scripts del monorepo estén en el PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../scripts')))
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile
from fastapi.responses import FileResponse
from services.api.routes import users, profiles, auth, inventory
import csv
from services.api.routes import suppliers, incidents, candidates

from contextlib import asynccontextmanager
from sqlmodel import SQLModel
from services.api.database import engine
import services.api.models

import uuid
from datetime import datetime
from tinydb import Query
from services.api.database import get_tinydb
from services.api.security import get_password_hash

from analyzer_core import process_incidents, calculate_metrics

def ensure_admin_user():
    admin_email= os.getenv('ADMIN_EMAIL')
    admin_password= os.getenv('ADMIN_PASSWORD')

    if not admin_email or not admin_password:
        return
    db=get_tinydb()
    users_table= db.table('users')
    profiles_table = db.table('profiles')
    user_query = Query()
    existing_user = users_table.search(user_query.email == admin_email)
    
    hashed_pwd = get_password_hash(admin_password)
    
    if existing_user:
        # Si ya existe, actualizamos la contraseña y nos aseguramos de que sea admin activo
        users_table.update({
            'hashed_password': hashed_pwd,
            'role': 'admin',
            'is_active': True,
            'created_at': existing_user[0].get('created_at', datetime.utcnow().isoformat())
        }, user_query.email == admin_email)
        print(f"✅ Administrador sincronizado: {admin_email}")
    else:
        # Si no existe, lo creamos con todos los poderes y su perfil
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "email": admin_email,
            "hashed_password": hashed_pwd,
            "is_active": True,
            "role": "admin",
            "created_at": datetime.utcnow().isoformat()
        }
        profile_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": "Administrador Nexova",
            "phone": None,
            "address": None
        }
        users_table.insert(user_data)
        profiles_table.insert(profile_data)
        print(f"🎉 Administrador creado exitosamente: {admin_email}")






@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Iniciando aplicación: Creando tablas en Supabase...")
    SQLModel.metadata.create_all(engine)
    ensure_admin_user()
    yield
    print("🛑 Cerrando aplicación...")

app = FastAPI(title="Nexova Incidents API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(suppliers.router)
app.include_router(users.router)
app.include_router(profiles.router)
app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(incidents.router)
app.include_router(candidates.router)

latest_metrics = None


@app.post("/api/incidents/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    """
    Recibe un archivo CSV, lo analiza y devuelve las métricas.
    """
    global latest_metrics
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")
        
    # Guardar el archivo subido en un archivo temporal
    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        # ¡Llamamos a tu lógica compartida de la Fase 1!
        valid_records, invalid_records = process_incidents(tmp_path)
        
        if valid_records is None:
            raise HTTPException(status_code=500, detail="Error procesando el archivo CSV")
            
        metrics = calculate_metrics(valid_records, invalid_records)
        
        # Guardamos en memoria para poder exportarlo después
        latest_metrics = metrics
        
        # Devolvemos un JSON al frontend
        return {
            "success": True,
            "metrics": metrics,
            "errores_encontrados": len(invalid_records)
        }
    finally:
        # Limpiar (borrar) el archivo temporal para no ocupar espacio
        if os.path.exists(tmp_path):
            os.remove(tmp_path)




@app.get("/api/incidents/results/export")
async def export_results():
    """
    Genera un archivo CSV con las últimas métricas procesadas y lo devuelve para descargar.
    """
    global latest_metrics
    if not latest_metrics:
        raise HTTPException(status_code=404, detail="No hay datos analizados previamente")
        
    # Crear un archivo temporal para el CSV de salida
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv", mode="w", newline="", encoding="utf-8")
    
    writer = csv.writer(tmp)
    writer.writerow(['Metrica', 'Valor'])
    writer.writerow(['Total Procesados', latest_metrics['total_procesados']])
    writer.writerow(['Total Válidos', latest_metrics['total_validos']])
    writer.writerow(['Total Inválidos', latest_metrics['total_invalidos']])
    writer.writerow(['Satisfacción Media', latest_metrics['satisfaccion_media']])
    
    for cat, count in latest_metrics['conteo_categorias'].items():
        writer.writerow([f'Categoria: {cat}', count])
    for estado, count in latest_metrics['conteo_estados'].items():
        writer.writerow([f'Estado: {estado}', count])
        
    tmp.close() # Cerramos para que FileResponse pueda leerlo
    
    # Devolver el archivo como descarga al navegador del usuario
    return FileResponse(
        tmp.name, 
        media_type="text/csv", 
        filename="resultados_incidencias.csv"
    )
