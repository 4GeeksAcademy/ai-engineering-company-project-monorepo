#!/usr/bin/env python3
"""Load realistic volume into the API's stores, to measure caching with evidence (not intuition).

Usage (needs the API's dependencies; stop the API first if you use a PostgreSQL DATABASE_URL):
    services/api/.venv/bin/python scripts/seed_load.py                       # defaults below
    services/api/.venv/bin/python scripts/seed_load.py --incidents 20000 --assets 3000 --orders 60000
    services/api/.venv/bin/python scripts/seed_load.py --reset               # wipe incidents/inventory/extra suppliers first

What it creates (deterministic: the same ``--seed`` gives the same data):

* incidents  — spread over ~2 years, 5 categories, 4 statuses with a coherent lifecycle history, branches and
               clients with a long-tailed distribution (a few big clients, many small), agents AGT-01..AGT-40,
               satisfaction scores only on resolved ones. Every document passes ``IncidentRecord``.
* inventory  — a catalogue (product family x model x office) and inbound/outbound orders. Orders are generated so
               that stock never goes negative, like the API's own rule.
* suppliers  — extra suppliers on top of the 15 of the original directory (currency follows the country).

Existing data is kept (new ids/SKUs continue after it) unless ``--reset`` is given, which wipes incidents and
inventory. Suppliers are always appended (the directory has no bulk reset): delete ``suppliers/db.json`` to start over.
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "services" / "api"))

from sqlmodel import Session, delete, func, select  # noqa: E402

from incidents import incident_store as store  # noqa: E402
from incidents.incident_schemas import IncidentRecord  # noqa: E402
from inventory.database import get_engine, init_db  # noqa: E402
from inventory.models import Asset, AssetEntry, AssetExit  # noqa: E402
from inventory.seeding import seed_author  # noqa: E402
from suppliers import service as suppliers_service  # noqa: E402
from suppliers.schemas import SupplierCategory, SupplierCreate  # noqa: E402

NOW = datetime(2026, 10, 1, tzinfo=timezone.utc)

# --- incidents ---------------------------------------------------------------------------------------------------

BRANCHES = ["Valencia Centro", "Valencia Puerto", "Madrid Castellana", "Barcelona Diagonal", "Sevilla Nervión",
            "Bilbao Abando", "Miami Brickell", "Miami Doral", "Orlando Downtown", "Tampa Westshore"]
CLIENTS = ["Iberdata Systems", "Retail Norte", "Banco Meridional", "Logística Levante", "TechNova Labs",
           "Grupo Almazán", "Fintrust Capital", "Sunstate Retail", "Atlantic Cloud Services", "Mediterráneo Seguros",
           "BlueWave Telecom", "Cadena Hotelera Costa", "Pharmalab Iberia", "Everglades Energy", "Quantum Payments",
           "Distribuciones Turia", "Nordik Software", "Palmetto Bank", "Kiwi Commerce", "Orange Grove Media"]
AGENTS = [f"AGT-{n:02d}" for n in range(1, 41)]

TEMPLATES = {
    "TECHNICAL": [
        ("No carga el panel de {x}", "El panel de {x} se queda en blanco tras iniciar sesión; probado en dos navegadores sin éxito."),
        ("Error 500 al exportar {x}", "Al exportar {x} aparece un error 500 de forma intermitente desde esta mañana."),
        ("Lentitud en la plataforma de {x}", "La plataforma de {x} tarda más de 20 segundos en responder en horas punta."),
        ("La integración con {x} falla", "La sincronización con {x} no se ejecuta desde el último despliegue; faltan datos del día."),
    ],
    "BILLING": [
        ("Factura duplicada de {x}", "El cliente ha recibido dos facturas con el mismo concepto de {x} y solicita la anulación de una."),
        ("Importe incorrecto en {x}", "El importe facturado en {x} no coincide con el contrato firmado; diferencia de varios cientos de euros."),
        ("Solicitud de abono de {x}", "Se solicita un abono parcial correspondiente a {x} por servicio no prestado."),
    ],
    "ACCESS": [
        ("Bloqueo de cuenta en {x}", "El usuario no puede acceder a {x} tras varios intentos; necesita desbloqueo y restablecer contraseña."),
        ("Alta de nuevo usuario en {x}", "Se necesita crear un usuario con permisos de lectura en {x} para una incorporación."),
        ("Permisos insuficientes en {x}", "El rol asignado no permite editar registros en {x}; se requiere ampliación temporal."),
    ],
    "HR_QUERY": [
        ("Consulta sobre nómina de {x}", "Una persona de {x} pregunta por el desglose de las retenciones de su última nómina."),
        ("Certificado de empresa para {x}", "Se solicita un certificado de empresa para un empleado de {x} con carácter urgente."),
        ("Dudas sobre vacaciones en {x}", "Hay dudas sobre el cómputo de vacaciones pendientes del equipo de {x}."),
    ],
    "COMPLAINT": [
        ("Queja por retraso en {x}", "El cliente expresa su malestar por el retraso en la entrega de {x} y pide un responsable."),
        ("Mala atención recibida en {x}", "Se recibe una queja formal por el trato recibido en la atención telefónica de {x}."),
        ("Reclamación por incumplimiento de {x}", "Reclamación formal por el incumplimiento del plazo acordado para {x}."),
    ],
}
TOPICS = ["facturación", "nóminas", "reporting", "CRM", "portal del candidato", "ATS", "agenda de entrevistas",
          "formación online", "contratos", "gestión documental", "VPN", "correo corporativo", "cuadro de mando"]
CATEGORY_WEIGHTS = {"TECHNICAL": 38, "BILLING": 22, "ACCESS": 18, "HR_QUERY": 12, "COMPLAINT": 10}
STATUS_WEIGHTS = {"resolved": 52, "open": 20, "in_progress": 18, "discarded": 10}
ORIGIN_WEIGHTS = {"customer": 60, "branch": 28, "internal": 12}
FIRST = ["Lucía", "Mateo", "Carmen", "Daniel", "Sofía", "Hugo", "Elena", "Pablo", "Valeria", "Javier", "Marta", "Álvaro"]
LAST = ["García", "Martínez", "López", "Smith", "Johnson", "Fernández", "Ruiz", "Brown", "Navarro", "Torres", "Davis"]
MAIL_DOMAINS = ["gmail.com", "outlook.com", "icloud.com", "empresa-cliente.es", "corp-mail.com"]


def _build_incident(rng: random.Random, number: int, actor: str) -> dict:
    category = rng.choices(list(CATEGORY_WEIGHTS), weights=CATEGORY_WEIGHTS.values())[0]
    title_t, desc_t = rng.choice(TEMPLATES[category])
    topic = rng.choice(TOPICS)
    origin = rng.choices(list(ORIGIN_WEIGHTS), weights=ORIGIN_WEIGHTS.values())[0]
    branch = rng.choice(BRANCHES) if origin == "branch" else rng.choice(["central", "central", *BRANCHES[:3]])
    if origin == "branch" and branch == "central":
        branch = BRANCHES[0]
    status = rng.choices(list(STATUS_WEIGHTS), weights=STATUS_WEIGHTS.values())[0]
    created = NOW - timedelta(days=rng.random() ** 0.8 * 730, minutes=rng.randint(0, 1439))
    # Long-tailed clients: the first ones show up much more often than the last.
    client = rng.choices(CLIENTS, weights=[1 / (i + 1) for i in range(len(CLIENTS))])[0] if rng.random() < 0.8 else None
    email = None
    if rng.random() < 0.7:
        email = f"{rng.choice(FIRST)}.{rng.choice(LAST)}{rng.randint(1, 99)}@{rng.choice(MAIL_DOMAINS)}".lower()
        email = email.translate(str.maketrans("áéíóúñ", "aeioun"))

    history = [{"at": created, "kind": "created", "actor": actor, "to_status": "open"}]
    updated, score, reason = created, None, None
    if status != "open":
        step = created + timedelta(hours=rng.randint(1, 36))
        path = {"in_progress": ["in_progress"], "resolved": ["in_progress", "resolved"], "discarded": ["discarded"]}[status]
        previous = "open"
        for target in path:
            history.append({"at": step, "kind": "status_changed", "actor": actor, "from_status": previous, "to_status": target})
            previous, updated, step = target, step, step + timedelta(hours=rng.randint(2, 96))
        if status == "resolved" and rng.random() < 0.75:
            score = rng.choices([1, 2, 3, 4, 5], weights=[4, 8, 20, 38, 30])[0]
        if status == "discarded":
            reason = rng.choice(["Duplicada de otra incidencia ya registrada", "El cliente retiró la solicitud",
                                 "No es una incidencia: consulta comercial"])
    record = IncidentRecord(
        id=f"NXV-{number:06d}",
        title=title_t.format(x=topic),
        description=desc_t.format(x=topic),
        category=category,
        origin=origin,
        branch=branch,
        client_company=client,
        agent_id=rng.choice(AGENTS) if status != "open" or rng.random() < 0.3 else None,
        customer_email=email,
        status=status,
        satisfaction_score=score,
        discard_reason=reason,
        created_at=created,
        updated_at=updated,
        history=history,
    )
    return record.model_dump(mode="json")


def seed_incidents(rng: random.Random, count: int, reset: bool) -> int:
    with store.lock:
        if reset:
            store.truncate()
        start = max((int(d["id"].split("-")[1]) for d in store.all_docs()), default=0) + 1
        store.insert_many([_build_incident(rng, start + i, "seed-load") for i in range(count)])
    return count


# --- inventory ---------------------------------------------------------------------------------------------------

FAMILIES = {  # family -> (category, models, unit)
    "Portátil": ("hardware", ['13" Ultralight', '14" Business', '15" Workstation', '16" Creator'], (3, 25)),
    "Monitor": ("hardware", ['24" FHD', '27" QHD', '32" 4K', '34" Ultrawide'], (3, 20)),
    "Ratón": ("peripherals", ["ergonómico", "inalámbrico", "vertical", "gaming"], (10, 60)),
    "Teclado": ("peripherals", ["mecánico", "compacto", "ergonómico split", "inalámbrico"], (10, 60)),
    "Auriculares": ("peripherals", ["con micrófono", "cancelación de ruido", "USB-C", "de diadema"], (8, 40)),
    "Hub USB-C": ("peripherals", ["7 puertos", "4 puertos", "con HDMI", "dock Thunderbolt"], (8, 40)),
    "Resma de papel": (
        "office_supplies", ["A4 80g", "A4 reciclado", "A3 90g", "A4 100g"], (50, 400)),
    "Bolígrafos": ("office_supplies", ["azul", "negro", "pack colores", "gel"], (100, 800)),
    "Cuaderno de formación": ("training_materials", ["liderazgo", "soft skills", "atención al cliente", "negociación"], (20, 200)),
    "Manual": ("training_materials", ["onboarding", "gestión del tiempo", "comunicación", "selección de talento"], (20, 200)),
}
SUPPLIERS_INV = {"Valencia": ["TechDistrib Valencia S.L.", "Papelería Central Valencia S.L.", "Formación Ibérica S.L.", "Mediterráneo IT"],
                 "Miami": ["Office Depot Miami", "Brickell Tech Supply", "Sunshine Stationery", "LearnPro USA"]}
PEOPLE = {"Valencia": ["María López", "Carlos Ruiz", "Ana Belmonte", "Jorge Climent", "Paula Ferrer", "Iván Soler"],
          "Miami": ["John Smith", "Emily Johnson", "Michael Brown", "Sophia Davis", "Daniel Garcia", "Olivia Martinez"]}


def seed_inventory(rng: random.Random, assets: int, orders: int, reset: bool) -> tuple[int, int, int]:
    init_db()
    author = seed_author()
    with Session(get_engine()) as session:
        if reset:
            for table in (AssetExit, AssetEntry, Asset):
                session.exec(delete(table))
            session.commit()
        existing = set(session.exec(select(Asset.sku)).all())
        created: list[Asset] = []
        counter = len(existing)
        combos = [(f, m, o) for f, (_, models, _) in FAMILIES.items() for m in models for o in ("Valencia", "Miami")]
        rng.shuffle(combos)
        for family, model, office in combos * (assets // len(combos) + 1):
            if len(created) >= assets:
                break
            counter += 1
            category = FAMILIES[family][0]
            sku = f"LD-{category[:3].upper()}-{counter:05d}"
            created.append(Asset(name=f"{family} {model}", sku=sku, category=category, office=office))
        session.add_all(created)
        session.commit()
        for asset in created:
            session.refresh(asset)

        entries: list[AssetEntry] = []
        exits: list[AssetExit] = []
        stock = {a.id: 0 for a in created}
        n_entries = int(orders * 0.35)
        for _ in range(n_entries):
            asset = rng.choice(created)
            low, high = FAMILIES[_family(asset.name)][2]
            quantity = rng.randint(low, high)
            stock[asset.id] += quantity
            entries.append(AssetEntry(asset_id=asset.id, quantity=quantity, supplier=rng.choice(SUPPLIERS_INV[asset.office]),
                                      office=asset.office, user_uuid=author, created_at=NOW - timedelta(minutes=rng.randint(0, 600_000))))
        for _ in range(orders - n_entries):
            asset = rng.choice([a for a in rng.sample(created, min(len(created), 25)) if stock[a.id] > 0] or created[:1])
            if stock[asset.id] <= 0:
                continue
            quantity = rng.randint(1, max(1, min(stock[asset.id], 12)))
            stock[asset.id] -= quantity
            consumption = asset.category in ("office_supplies", "training_materials") and rng.random() < 0.7
            exits.append(AssetExit(asset_id=asset.id, quantity=quantity, exit_type="consumption" if consumption else "allocation",
                                   assigned_to=None if consumption else rng.choice(PEOPLE[asset.office]), office=asset.office,
                                   user_uuid=author, created_at=NOW - timedelta(minutes=rng.randint(0, 590_000))))
        session.add_all(entries)
        session.add_all(exits)
        session.commit()
        return len(created), len(entries), len(exits)


def _family(name: str) -> str:
    return next(f for f in sorted(FAMILIES, key=len, reverse=True) if name.startswith(f))


# --- suppliers ---------------------------------------------------------------------------------------------------

SUP_PREFIX = ["Talent", "Hire", "Recruit", "People", "Skill", "Work", "Career", "Staff", "Nexo", "Prisma"]
SUP_SUFFIX = ["Hub", "Cloud", "Labs", "Systems", "Works", "Pro", "Direct", "Suite", "Partners", "Connect"]


def seed_suppliers(rng: random.Random, count: int) -> int:
    db = suppliers_service.get_db()
    categories = [c.value for c in SupplierCategory]
    rows = []
    for i in range(count):
        country = rng.choice(["Spain", "USA"])
        rows.append(SupplierCreate(
            name=f"{rng.choice(SUP_PREFIX)}{rng.choice(SUP_SUFFIX)} {i + 1:04d}",
            country=country,
            categories=rng.sample(categories, rng.randint(1, 3)),
            monthly_rate=round(rng.uniform(80, 6000), 2),
            currency="EUR" if country == "Spain" else "USD",
            status=rng.choices(["active", "suspended"], weights=[85, 15])[0],
            contract_renewal_date=(NOW + timedelta(days=rng.randint(-200, 700))).date().isoformat(),
        ).model_dump(mode="json") | {"updated_at": (NOW - timedelta(days=rng.randint(0, 400))).isoformat()})
    db.insert_multiple(rows)
    return count


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Load realistic volume into incidents, inventory and suppliers.")
    parser.add_argument("--incidents", type=int, default=8000)
    parser.add_argument("--assets", type=int, default=800)
    parser.add_argument("--orders", type=int, default=30000, help="inbound + outbound orders (35%% / 65%%)")
    parser.add_argument("--suppliers", type=int, default=300)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--reset", action="store_true", help="wipe incidents and inventory before loading")
    args = parser.parse_args(argv)
    rng = random.Random(args.seed)

    print(f"incidents: +{seed_incidents(rng, args.incidents, args.reset)} ({len(store.all_docs())} in total)")
    assets, entries, exits = seed_inventory(rng, args.assets, args.orders, args.reset)
    with Session(get_engine()) as session:
        total = (session.exec(select(func.count()).select_from(Asset)).one(), session.exec(select(func.count()).select_from(AssetEntry)).one(),
                 session.exec(select(func.count()).select_from(AssetExit)).one())
    print(f"inventory: +{assets} assets, +{entries} inbound, +{exits} outbound (totals: {total[0]} / {total[1]} / {total[2]})")
    print(f"suppliers: +{seed_suppliers(rng, args.suppliers)} ({len(suppliers_service.get_db())} in total)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
