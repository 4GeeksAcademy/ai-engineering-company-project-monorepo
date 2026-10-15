from getpass import getpass

from tinydb import Query

from services.api.auth.storage import open_db
from services.api.auth.security import verify_password


def bootstrap_first_admin(email: str, password: str):
    email = email.strip().lower()

    with open_db() as db:
        users = db.table("users")

        if users.contains(Query().role == "admin"):
            raise ValueError("Ya existe un administrador")

        user = users.get(Query().email == email)

        if (
            not user
            or not user.get("is_active")
            or not verify_password(
                password, user["hashed_password"]
            )
        ):
            raise ValueError(
                "Usuario o contraseña incorrectos"
            )

        users.update(
            {"role": "admin"},
            doc_ids=[user.doc_id],
        )

        return {
            "id": user.doc_id,
            "email": user["email"],
            "role": "admin",
        }


def main():
    print("Configuración del primer administrador")
    email = input("Email del usuario existente: ")
    password = getpass("Contraseña: ")

    try:
        admin = bootstrap_first_admin(email, password)
        print("ADMIN CREADO OK:", admin["email"])
    except ValueError as error:
        print("ERROR:", error)


if __name__ == "__main__":
    main()
