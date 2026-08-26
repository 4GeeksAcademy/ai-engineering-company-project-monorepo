"""Load CONTEXT.md / CONTEXT-company.md suppliers into TinyDB. Run: uv run seed"""

from __future__ import annotations

import sys
from pathlib import Path


def _repo_root() -> Path:
    cwd = Path.cwd()
    if (cwd / "CONTEXT-company.md").is_file():
        return cwd
    here = Path(__file__).resolve().parent
    for candidate in [here, *here.parents]:
        if (candidate / "CONTEXT-company.md").is_file():
            return candidate
    return cwd


def _prepare_imports(root: Path) -> None:
    api_dir = str(root / "services" / "api")
    if api_dir not in sys.path:
        sys.path.insert(0, api_dir)


def load_context_suppliers() -> dict[str, list[str]]:
    """Insert CONTEXT seed suppliers that are not already in TinyDB. Skip existing ids."""
    root = _repo_root()
    _prepare_imports(root)

    from tinydb import Query, TinyDB

    import database
    import models

    database.SUPPLIERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    db = TinyDB(database.SUPPLIERS_FILE, indent=2, ensure_ascii=False)
    table = db.table(database.SUPPLIERS_TABLE)
    lookup = Query()
    stamped = models.utc_now()
    inserted: list[str] = []
    skipped: list[str] = []
    for row in models.SEED_SUPPLIERS:
        supplier_id = str(row["supplier_id"])
        if table.search(lookup.supplier_id == supplier_id):
            skipped.append(supplier_id)
            continue
        table.insert({**row, "updated_at": stamped})
        inserted.append(supplier_id)
    db.close()
    return {"inserted": inserted, "skipped": skipped}


def main() -> None:
    result = load_context_suppliers()
    inserted = result["inserted"]
    skipped = result["skipped"]
    print(f"Inserted {len(inserted)} record{'s' if len(inserted) != 1 else ''}.")
    if skipped:
        print(f"Skipped {len(skipped)} existing record{'s' if len(skipped) != 1 else ''} (no duplicates).")
    if inserted:
        print(f"New supplier ids: {', '.join(inserted)}")


if __name__ == "__main__":
    main()
