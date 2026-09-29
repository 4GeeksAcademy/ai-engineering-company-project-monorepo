"""Create an internal user from the command line (first admin, recovery).

    uv run create-user --username ines --role admin     # prompts for the password
"""

from __future__ import annotations

import argparse
import getpass

from pydantic import ValidationError

from . import service
from .schemas import Role, UserCreate


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an internal API user.")
    parser.add_argument("--username", required=True)
    parser.add_argument("--role", required=True, choices=[role.value for role in Role])
    args = parser.parse_args()

    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Repeat password: "):
        raise SystemExit("Passwords do not match.")
    try:
        user = service.create_user(
            UserCreate(username=args.username, password=password, role=args.role)
        )
    except ValidationError as exc:
        problems = "; ".join(e["msg"] for e in exc.errors(include_input=False))
        raise SystemExit(f"Invalid user: {problems}") from exc
    except service.UsernameTakenError as exc:
        raise SystemExit(str(exc)) from exc
    print(f"Created {user['role']} '{user['username']}'.")


if __name__ == "__main__":
    main()
