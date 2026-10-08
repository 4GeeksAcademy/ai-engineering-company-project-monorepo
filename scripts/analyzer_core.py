import csv

#DEFINICION DE VALORES PERMITIDOS SEGUN REGLAS NEGOCIO.
VALID_CATEGORIES = {'fallo_operativo', 'queja', 'solicitud'}
VALID_STATES = {'abierto', 'cerrado', 'descartado'}
REQUIRED_FIELDS = {
    'id_incidencia',
    'email_cliente',
    'canal_entrada',
    'sector_cliente',
    'categoria',
    'estado',
    }

def validate_record(row):
    for field in REQUIRED_FIELDS:
        if field not in row or str(row[field]).strip() =="":
            return False, f"falta el campo obligatorio: {field}"

    if row ['categoria'] not in VALID_CATEGORIES:
        return False, f"Categoría inválida: {row['categoria']}"


    if row['estado'] not in VALID_STATES:
        return False, f"Estado inválido: {row['estado']}"
    
    return True, None


def process_incidents(filepath):
    valid_records= []
    invalid_records= []

    try:
        with open(filepath, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)

            for row in reader:
                is_valid, error_reason = validate_record(row)
                
                if is_valid:
                    valid_records.append(row)
                else:
                    invalid_records.append({
                        'row': row,
                        'reason': error_reason
                    })

        return valid_records,invalid_records
    
    except FileNotFoundError:
        print(f"Error: No se encontro el archivo  {filepath}")
        return None, None


def calculate_metrics(valid_records, invalid_records):
    total_validos = len (valid_records)
    total_invalidos = len(invalid_records)
    total_procesados = total_validos + total_invalidos

    conteo_categorias = {'fallo_operativo': 0, 'queja': 0, 'solicitud': 0}
    conteo_estados = {'abierto':0, 'cerrado': 0, 'descartado': 0}

    suma_satisfaccion = 0
    casos_con_satisfaccion = 0

    for record in valid_records:

        categoria = record['categoria']
        if categoria in conteo_categorias:
            conteo_categorias[categoria] += 1

        estado = record['estado']
        if estado in conteo_estados:
            conteo_estados[estado] += 1

        if estado== 'cerrado' and record.get('puntuacion_satisfaccion'):
            try:
                puntuacion = int(record.get('puntuacion_satisfaccion'))
                suma_satisfaccion+= puntuacion
                casos_con_satisfaccion+=1
            except ValueError:
                pass
        
    satisfaccion_media = 0
    if casos_con_satisfaccion > 0:
        satisfaccion_media = suma_satisfaccion / casos_con_satisfaccion

    return{
        "total_procesados": total_procesados,
        "total_validos": total_validos,
        "total_invalidos": total_invalidos,
        "conteo_categorias": conteo_categorias,
        "conteo_estados": conteo_estados,
        "satisfaccion_media": round(satisfaccion_media, 2)
    }