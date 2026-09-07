import sys
import os
from datetime import datetime

# Make sure we can import from the local package when running from anywhere
sys.path.append(os.path.dirname(__file__))

from database import get_db

SEED_DATA = [
    {
        "name": "Tech Corp",
        "country": "USA",
        "categories": ["IT"],
        "hourly_rate": 150.0,
        "status": "active"
    },
    {
        "name": "Global Marketing",
        "country": "UK",
        "categories": ["Marketing"],
        "hourly_rate": 80.0,
        "status": "active"
    },
    {
        "name": "Office Supplies Co",
        "country": "Spain",
        "categories": ["Facilities"],
        "hourly_rate": 45.0,
        "status": "suspended"
    }
]

def run_seed():
    db = get_db()
    if len(db) > 0:
        print("Database already contains records. Seeding skipped.")
        return

    now = datetime.utcnow().isoformat()
    count = 0
    for record in SEED_DATA:
        record["updated_at"] = now
        db.insert(record)
        count += 1
        
    print(f"Successfully inserted {count} records into TinyDB.")

if __name__ == "__main__":
    run_seed()
