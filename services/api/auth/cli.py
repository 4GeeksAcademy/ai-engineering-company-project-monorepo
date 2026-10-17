"""Create an internal user from the command line (first user, recovery).

    uv run create-user --email ines@example.com [--role admin]   # prompts for the password
"""

from __future__ import annotations

import argparse
import getpass

from pydantic import ValidationError

from users import service
from users.schemas import Role, UserCreate


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an internal API user.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", choices=[r.value for r in Role], default=Role.user.value)
    args = parser.parse_args()

    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Repeat password: "):
        raise SystemExit("Passwords do not match.")
    try:
        user = service.create_user(UserCreate(email=args.email, password=password), role=Role(args.role))
    except ValidationError as exc:
        problems = "; ".join(e["msg"] for e in exc.errors(include_input=False))
        raise SystemExit(f"Invalid user: {problems}") from exc
    except service.EmailTakenError as exc:
        raise SystemExit(str(exc)) from exc
    print(f"Created {user.role} {user.email} ({user.id}).")


if __name__ == "__main__":
    main()
