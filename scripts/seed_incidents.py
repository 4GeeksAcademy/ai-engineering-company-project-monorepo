import csv
import os
import sys

# Asegurar que el path incluye el directorio raíz para poder importar 'packages' y 'services'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from packages.shared.validation import IncidentCreate, IncidentOrigin, IncidentStatus, IncidentBranch, IncidentCategory
from services.api.database import get_db

def map_estado(estado_csv):
    mapping = {
        'abierto': IncidentStatus.open,
        'cerrado': IncidentStatus.resolved,
        'descartado': IncidentStatus.discarded
    }
    return mapping.get(estado_csv)

def map_categoria(cat_csv):
    try:
        return IncidentCategory(cat_csv)
    except ValueError:
        return None

def run_seed():
    db = get_db()
    incidents_table = db.table('incidents')
    
    csv_path = os.path.join(os.path.dirname(__file__), 'incidents-COMPANY.csv')
    
    if not os.path.exists(csv_path):
        print(f"Error: No se encontró el archivo {csv_path}")
        return
        
    inserted_count = 0
    error_count = 0
    
    # IDs ya insertados para idempotencia
    existing_records = incidents_table.all()
    # Asumiremos que el id en la base de datos es el id_incidencia para evitar duplicados históricos
    # Guardaremos el id_incidencia original en el campo description o title de alguna forma, 
    # o simplemente verificamos por un prefijo en el titulo.
    existing_titles = {rec['title'] for rec in existing_records}

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            id_inc = row.get('id_incidencia', '')
            email = row.get('email_cliente', '')
            canal = row.get('canal_entrada', '')
            sector = row.get('sector_cliente', '')
            cat_csv = row.get('categoria', '')
            est_csv = row.get('estado', '')
            
            # 1. Transformar estado
            estado = map_estado(est_csv)
            # 2. Transformar categoría
            categoria = map_categoria(cat_csv)
            
            # Transformaciones requeridas por la estrategia (asumimos defaults lógicos si el CSV no los tiene)
            title = f"Incidencia histórica #{id_inc} - {sector}"
            description = f"Reporte del cliente {email} recibido por {canal}."
            branch = IncidentBranch.central
            
            # Idempotencia: no insertar si el titulo ya existe
            if title in existing_titles:
                continue
                
            # Si estado o categoría no son válidos, lo contamos como error (reutilizando validación pydantic implícitamente)
            if not estado or not categoria:
                print(f"Error en fila {id_inc}: estado '{est_csv}' o categoría '{cat_csv}' inválidos.")
                error_count += 1
                continue
                
            try:
                # La lógica de validación Pydantic se encarga de revisar todo antes de crear el dict
                incident_data = IncidentCreate(
                    title=title,
                    description=description,
                    category=categoria,
                    status=estado,
                    origin=IncidentOrigin.customer,
                    branch=branch
                )
                
                # Insertamos en la BD transformando el modelo a diccionario
                # Le añadimos un id y fechas para persistirlo
                from packages.shared.validation import IncidentInDB
                db_record = IncidentInDB(**incident_data.model_dump())
                incidents_table.insert(db_record.model_dump())
                
                inserted_count += 1
                existing_titles.add(title)
            except Exception as e:
                print(f"Error de validación en fila {id_inc}: {e}")
                error_count += 1

    print(f"Seed completado: {inserted_count} insertados, {error_count} errores.")

if __name__ == "__main__":
    run_seed()
