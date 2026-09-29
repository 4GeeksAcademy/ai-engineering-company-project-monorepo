"""Create an internal user from the command line (first user, recovery).

    uv run create-user --email ines@example.com     # prompts for the password
"""

from __future__ import annotations

import argparse
import getpass

from pydantic import ValidationError

from users import service
from users.schemas import UserCreate


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an internal API user.")
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Repeat password: "):
        raise SystemExit("Passwords do not match.")
    try:
        user = service.create_user(UserCreate(email=args.email, password=password))
    except ValidationError as exc:
        problems = "; ".join(e["msg"] for e in exc.errors(include_input=False))
        raise SystemExit(f"Invalid user: {problems}") from exc
    except service.EmailTakenError as exc:
        raise SystemExit(str(exc)) from exc
    print(f"Created user {user.email} ({user.user_uuid}).")


if __name__ == "__main__":
    main()
