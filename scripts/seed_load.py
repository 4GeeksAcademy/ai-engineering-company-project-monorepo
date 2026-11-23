"""Load-test seeder: realistic volume for the incident manager and the inventory.

With a handful of rows every endpoint answers in milliseconds, so timing logs cannot show where
caching pays off. This script inserts thousands of varied, coherent rows:

* incidents: titles/descriptions built from per-category templates, every enum value, lifecycle-valid
  statuses (open / in_progress / resolved / discarded), created over the last 12 months.
* inventory: a catalogue of assets over 4 categories and 2 offices, many entries (deliveries) and
  exits (allocations / consumptions) that never take stock below zero.

It writes where the API reads (INCIDENTS_DB_PATH and DATABASE_URL), so point those at throwaway
targets, e.g. a temp TinyDB file and a SQLite URL. It refuses a non-SQLite DATABASE_URL (the real
Supabase) unless --allow-remote is given. Re-running adds more rows; use --reset to start over.

Usage, from the repo root:
    INCIDENTS_DB_PATH=/tmp/inc.json DATABASE_URL=sqlite:////tmp/inv.db \\
      uv run --project services/api python scripts/seed_load.py --incidents 5000 --assets 300 --orders 20000
"""

from __future__ import annotations

import argparse
import random
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlmodel import Session, delete

import config
from database import IncidentRepository, create_db_and_tables, get_engine, incidents_db_path_from_env
from incident_models import IncidentRecord
from inventory_models import Asset, AssetEntry, AssetExit
from nexova_shared.incidents import Branch, IncidentCategory, IncidentOrigin, IncidentStatus

# --- incidents --------------------------------------------------------------------------------

SYSTEMS = ["el CRM", "el portal de candidatos", "la VPN", "el helpdesk", "el sistema de nóminas", "el correo corporativo", "el ATS", "la intranet", "el módulo de facturación", "Teams"]
CLIENTS = ["Iberlog", "Meridian Foods", "Costa Brava Energy", "Atlas Retail", "Norte Seguros", "Levante Pharma", "Sunbelt Logistics", "Brickell Capital", "Orange Grove Media", "Pacifica Health"]
ROLES = ["analista de datos", "desarrollador backend", "comercial B2B", "responsable de RRHH", "técnico de soporte", "project manager", "diseñador UX", "contable"]
TEMPLATES: dict[IncidentCategory, list[tuple[str, str]]] = {
    IncidentCategory.TECHNICAL_FAILURE: [
        ("Caída de {system}", "Desde las {hour}:00 {system} no responde. Varios equipos de {branch} no pueden trabajar y el reinicio del servicio no ha resuelto el problema."),
        ("Lentitud grave en {system}", "Las pantallas de {system} tardan más de 30 segundos en cargar. Ocurre de forma intermitente desde hace {days} días."),
    ],
    IncidentCategory.PROCESS_ERROR: [
        ("Factura duplicada de {client}", "Se emitió dos veces la factura del mes de {client}. Hay que anular la segunda y avisar a administración antes del cierre."),
        ("Alta de {role} sin completar", "El proceso de onboarding de un {role} quedó a medias: falta el equipo y el acceso a {system}."),
    ],
    IncidentCategory.CLIENT_COMPLAINT: [
        ("Queja de {client} por retraso", "{client} reclama que la candidatura prometida llevaba {days} días de retraso y pide hablar con un responsable."),
        ("{client} cuestiona la calidad del perfil", "El perfil de {role} enviado a {client} no cumple los requisitos de la oferta. Solicitan sustitución sin coste."),
    ],
    IncidentCategory.CANDIDATE_ISSUE: [
        ("Candidato sin respuesta tras entrevista", "Un candidato de {role} lleva {days} días esperando feedback tras la entrevista final y ha escalado por correo."),
        ("Error en el CV importado de {system}", "El CV de un candidato se importó con los datos de contacto cruzados con otro registro."),
    ],
    IncidentCategory.STAFF_ISSUE: [
        ("Conflicto de agenda en {branch}", "Dos consultores tienen asignada la misma entrevista de {client} y ninguno puede cederla."),
        ("Baja imprevista de {role}", "Una baja médica deja sin cubrir {days} procesos de selección activos en {branch}."),
    ],
    IncidentCategory.SLA_BREACH: [
        ("SLA de respuesta incumplido para {client}", "El ticket de {client} superó las 24 h de primera respuesta pactadas; llevan {days} días sin contacto."),
        ("SLA de cobertura incumplido", "La vacante de {role} para {client} no tuvo terna a los {days} días acordados en contrato."),
    ],
    IncidentCategory.DATA_QUALITY: [
        ("Registros duplicados en {system}", "Un informe de {system} muestra {days}0 clientes duplicados que distorsionan los KPI semanales de dirección."),
        ("Campos vacíos en exportación de {system}", "La exportación mensual de {system} llega con la columna de sede vacía en varios registros."),
    ],
    IncidentCategory.OTHER: [
        ("Solicitud de acceso a {system}", "Se pide revisar los permisos de un {role} que cambió de equipo."),
    ],
}
# Weights make the data skewed like a real helpdesk: mostly technical/process, rarely "other".
CATEGORY_WEIGHTS = [28, 18, 14, 9, 7, 10, 10, 4]
STATUS_WEIGHTS = {IncidentStatus.OPEN: 22, IncidentStatus.IN_PROGRESS: 18, IncidentStatus.RESOLVED: 52, IncidentStatus.DISCARDED: 8}
BRANCH_LABEL = {Branch.CENTRAL: "la sede central", Branch.VALENCIA_OPERATIONS: "Valencia Operaciones", Branch.MIAMI_OFFICE: "la oficina de Miami", Branch.REMOTE: "el equipo remoto"}


def make_incidents(count: int, rng: random.Random, now: datetime) -> list[IncidentRecord]:
    categories = list(IncidentCategory)
    records = []
    for _ in range(count):
        category = rng.choices(categories, weights=CATEGORY_WEIGHTS)[0]
        title, description = rng.choice(TEMPLATES[category])
        branch = rng.choice(list(Branch))
        values = {
            "system": rng.choice(SYSTEMS),
            "client": rng.choice(CLIENTS),
            "role": rng.choice(ROLES),
            "branch": BRANCH_LABEL[branch],
            "days": rng.randint(2, 9),
            "hour": rng.randint(7, 19),
        }
        status = rng.choices(list(STATUS_WEIGHTS), weights=list(STATUS_WEIGHTS.values()))[0]
        created = now - timedelta(minutes=rng.randint(0, 365 * 24 * 60))
        # Lifecycle-valid history: a final or in-progress incident was touched after it was created.
        updated = created if status is IncidentStatus.OPEN else created + timedelta(minutes=rng.randint(30, 6 * 24 * 60))
        origin = rng.choices(list(IncidentOrigin), weights=[60, 25, 15])[0]
        records.append(
            IncidentRecord(
                title=title.format(**values)[:120],
                description=description.format(**values),
                category=category,
                status=status,
                origin=origin,
                branch=branch,
                created_at=created,
                updated_at=min(updated, now),
            )
        )
    return records


# --- inventory --------------------------------------------------------------------------------

CATALOGUE = {
    "hardware": ["Portátil 14\" Business", "Portátil 16\" Workstation", "Monitor 27\" 4K", "Docking station Thunderbolt", "Tablet 11\" para entrevistas", "Móvil corporativo", "Servidor NAS 4 bahías"],
    "peripherals": ["Ratón ergonómico", "Teclado mecánico ES", "Hub USB-C", "Auriculares con micrófono", "Webcam Full HD", "Alfombrilla XL", "Cable HDMI 2 m"],
    "office_supplies": ["Resma de papel A4", "Caja de bolígrafos", "Pack de 12 carpetas", "Post-it surtidos", "Tóner láser negro", "Pizarra blanca 120x90", "Grapadora industrial"],
    "training_materials": ["Cuaderno de formación en liderazgo", "Manual de onboarding", "Kit de dinámicas de grupo", "Licencia de curso e-learning", "Pack de tarjetas de entrevista"],
}
CATEGORY_PREFIX = {"hardware": "IT", "peripherals": "PER", "office_supplies": "OFF", "training_materials": "TRN"}
OFFICES = ["Valencia", "Miami"]
SUPPLIERS = ["TechDistrib Valencia S.L.", "Office Depot Miami", "Papelería Central", "Dell Business Iberia", "Logitech Partners", "CDW Florida", "Formación Activa S.A.", "Amazon Business"]
ASSIGNEES = ["Laura Mendoza", "Carlos Ibáñez", "Marta Soler", "Diego Fuentes", "Ana Beltrán", "Javier Ortega", "Sofía Navarro", "Pablo Ríos", "Elena Gil", "Hugo Castillo"]


def make_inventory(session: Session, assets: int, orders: int, rng: random.Random, now: datetime, user_uuid: str) -> tuple[int, int, int]:
    new_assets: list[Asset] = []
    serial = 0
    while len(new_assets) < assets:
        category = rng.choice(list(CATALOGUE))
        serial += 1
        name = f"{rng.choice(CATALOGUE[category])} · lote {serial}"
        new_assets.append(Asset(name=name, sku=f"NXV-{CATEGORY_PREFIX[category]}-{uuid.uuid4().hex[:8].upper()}", category=category, office=rng.choice(OFFICES)))
    session.add_all(new_assets)
    session.flush()

    stock = {asset.id: 0 for asset in new_assets}
    entries: list[AssetEntry] = []
    exits: list[AssetExit] = []
    ids = list(stock)
    by_id = {asset.id: asset for asset in new_assets}
    # ~40% of the orders are deliveries, the rest exits; exits are generated after the stock exists.
    for _ in range(int(orders * 0.4)):
        asset = rng.choice(new_assets)
        quantity = rng.choice([1, 2, 3, 5, 5, 10, 10, 20, 50])
        stock[asset.id] += quantity
        entries.append(AssetEntry(asset_id=asset.id, quantity=quantity, supplier=rng.choice(SUPPLIERS), office=asset.office, created_at=now - timedelta(minutes=rng.randint(60 * 24 * 7, 365 * 24 * 60)), user_uuid=user_uuid))
    while len(exits) < orders - len(entries):
        asset_id = rng.choice(ids)
        asset = by_id[asset_id]
        if stock[asset_id] <= 0:
            if not any(stock.values()):
                break
            continue
        quantity = min(rng.choice([1, 1, 2, 3, 5, 10]), stock[asset_id])
        stock[asset_id] -= quantity
        allocation = asset.category in {"hardware", "peripherals"} and rng.random() < 0.8
        exits.append(
            AssetExit(
                asset_id=asset_id,
                quantity=quantity,
                exit_type="allocation" if allocation else "consumption",
                assigned_to=rng.choice(ASSIGNEES) if allocation else None,
                office=asset.office,
                created_at=now - timedelta(minutes=rng.randint(0, 60 * 24 * 7 * 50)),
                user_uuid=user_uuid,
            )
        )
    session.add_all(entries)
    session.add_all(exits)
    session.commit()
    return len(new_assets), len(entries), len(exits)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--incidents", type=int, default=5000)
    parser.add_argument("--assets", type=int, default=300)
    parser.add_argument("--orders", type=int, default=20000, help="entries + exits, in total")
    parser.add_argument("--seed", type=int, default=42, help="random seed: same value, same data")
    parser.add_argument("--reset", action="store_true", help="empty the target incidents file and inventory tables first")
    parser.add_argument("--allow-remote", action="store_true", help="allow a non-SQLite DATABASE_URL (the real Supabase)")
    args = parser.parse_args()

    url = config.database_url()
    if args.assets and not url.startswith("sqlite") and not args.allow_remote:
        print("Refusing to write thousands of rows to a non-SQLite DATABASE_URL; use a sqlite: URL or pass --allow-remote.", file=sys.stderr)
        return 1

    rng = random.Random(args.seed)
    now = datetime.now(UTC)
    user_uuid = str(uuid.UUID(int=rng.getrandbits(128), version=4))

    if args.incidents:
        path = incidents_db_path_from_env()
        if args.reset and Path(path).exists():
            Path(path).unlink()
        repository = IncidentRepository(path)
        try:
            inserted = repository.create_many(make_incidents(args.incidents, rng, now))
        finally:
            repository.close()
        print(f"incidents: {inserted} inserted into {path}")

    if args.assets:
        create_db_and_tables()
        with Session(get_engine()) as session:
            if args.reset:
                for table in (AssetExit, AssetEntry, Asset):
                    session.exec(delete(table))
                session.commit()
            a, e, x = make_inventory(session, args.assets, args.orders, rng, now, user_uuid)
        print(f"inventory: {a} assets, {e} entries, {x} exits inserted")
    return 0


if __name__ == "__main__":
    sys.exit(main())
