"""Seed the TinyDB database with test users (and their linked profiles).

Uses the users service layer so passwords are hashed and profiles are
created exactly as they would be via POST /api/v1/users.

Usage (via uv):
    uv run seed-users
"""

from __future__ import annotations

from app.models.user import UserCreate, UserRole
from app.services import users as users_service

# Development-only credentials — never use these outside local testing.
INITIAL_USERS: list[dict] = [
    {
        "email": "admin@brasaland.com",
        "password": "Admin123!",
        "role": UserRole.ADMIN,
        "name": "Admin Brasaland",
        "phone": "+57 300 000 0001",
        "address": "Cra. 43A #1-50, Medellín",
    },
    {
        "email": "manager@brasaland.com",
        "password": "Manager123!",
        "role": UserRole.MANAGER,
        "name": "Valentina Gómez",
        "phone": "+57 310 555 0102",
        "address": "Cl. 85 #11-53, Bogotá",
    },
    {
        "email": "manager.miami@brasaland.com",
        "password": "Manager123!",
        "role": UserRole.MANAGER,
        "name": "Daniel Herrera",
        "phone": "+1 305 555 0199",
        "address": "701 Brickell Ave, Miami, FL",
    },
    {
        "email": "user1@brasaland.com",
        "password": "User123!",
        "role": UserRole.USER,
        "name": "Camila Ospina",
        "phone": "+57 310 123 4567",
        "address": "Cl. 10 #38-20, Medellín",
    },
    {
        "email": "user2@brasaland.com",
        "password": "User123!",
        "role": UserRole.USER,
        "name": "Santiago Rodríguez",
        "phone": "+57 315 987 6543",
        "address": "Cra. 7 #72-41, Bogotá",
    },
    {
        "email": "user3@brasaland.com",
        "password": "User123!",
        "role": UserRole.USER,
        "name": "Andrea Mejía",
        "phone": "+1 407 555 5678",
        "address": "200 S Orange Ave, Orlando, FL",
    },
]


def seed() -> None:
    """Create each user, skipping those whose email already exists."""
    inserted = 0
    skipped = 0

    for data in INITIAL_USERS:
        try:
            user = users_service.create_user(UserCreate(**data))
        except ValueError:
            skipped += 1
            print(f"  ⏭  Skipped (duplicate): {data['email']}")
            continue
        inserted += 1
        print(f"  ✅ Inserted: {user['email']} (id={user['id']}, role={user['role']})")

    print()
    print("─" * 50)
    print("  📊 Summary")
    print(f"     Inserted   : {inserted}")
    print(f"     Skipped    : {skipped}")
    print(f"     Total in DB: {len(users_service.list_users())}")
    print("─" * 50)


def main() -> None:
    """Entry point for `uv run seed-users`."""
    print("🌱 Seeding Brasaland users into TinyDB …")
    print()
    seed()
    print("\nDone! ✨")


if __name__ == "__main__":
    main()
