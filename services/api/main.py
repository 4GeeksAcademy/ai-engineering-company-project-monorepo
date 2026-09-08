import sys
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile
from fastapi.responses import FileResponse
from services.api.routes import users, profiles, auth, incidents, candidates
import csv
from services.api.routes import suppliers

sys.path.append(os.path.join(os.path.dirname(__file__), '../../scripts'))
from analyzer_core import process_incidents, calculate_metrics

app = FastAPI(title="Nexova Incidents API")

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
app.include_router(candidates.router)
app.include_router(auth.router)
app.include_router(incidents.router)

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
