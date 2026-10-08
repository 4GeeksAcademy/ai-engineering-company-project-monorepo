import sys
import csv
from analyzer_core import process_incidents, calculate_metrics

def print_summary(metrics):

    print("\n" + "="*50)
    print("📊 RESUMEN DE ANÁLISIS DE INCIDENCIAS")
    print("="*50 + "\n")

    print(f"Total procesados: {metrics['total_procesados']}")
    print(f"  ✅ Válidos:    {metrics['total_validos']}")
    print(f"  ❌ Inválidos:  {metrics['total_invalidos']}\n")

    print("Desglose por Categoría:")
    for cat, count in metrics['conteo_categorias'].items():
        print(f"  - {cat.replace('_', ' ').title().ljust(20)}: {count}")
    print("\n")

    print("Desglose por Estado:")
    for estado, count in metrics['conteo_estados'].items():
        print(f"  - {estado.title().ljust(20)}: {count}")
    print("\n")

    print(f"⭐ Índice de satisfacción medio (Cerrados): {metrics['satisfaccion_media']}/100")
    print("\n" + "="*50 + "\n")


def main():
    if len(sys.argv) < 2:
        print("Uso: python analyze.py <ruta_al_archivo.csv>")
        sys.exit(1)
        
    filepath = sys.argv[1]

    valid_records, invalid_records = process_incidents(filepath)

    if valid_records is None:
        sys.exit(1)

    if invalid_records:
        print(f"\n⚠️ Se encontraron {len(invalid_records)} registros inválidos que fueron excluidos:")
        for inv in invalid_records:
            print(f"   - {inv['reason']}")

    metrics = calculate_metrics(valid_records, invalid_records)
    print_summary(metrics)

    
    export = input("¿Deseas exportar los resultados a CSV? [s/n]: ").strip().lower()
    if export == 's':
        try:
            with open('results.csv', mode='w', encoding='utf-8', newline='') as file:
                writer = csv.writer(file)
                writer.writerow(['Metrica', 'Valor'])
                writer.writerow(['Total Procesados', metrics['total_procesados']])
                writer.writerow(['Total Válidos', metrics['total_validos']])
                writer.writerow(['Total Inválidos', metrics['total_invalidos']])
                writer.writerow(['Satisfacción Media', metrics['satisfaccion_media']])
                for cat, count in metrics['conteo_categorias'].items():
                    writer.writerow([f'Categoria: {cat}', count])
                for estado, count in metrics['conteo_estados'].items():
                    writer.writerow([f'Estado: {estado}', count])
            print("✅ Resultados exportados exitosamente a 'results.csv'.")
        except Exception as e:
            print(f"Error crítico al exportar resultados: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error inesperado en analyze.py: {e}", file=sys.stderr)
        sys.exit(1)