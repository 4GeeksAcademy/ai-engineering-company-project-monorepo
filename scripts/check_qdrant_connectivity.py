#!/usr/bin/env python3
"""Verify Qdrant connectivity from the project Python environment."""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))


def main() -> int:
    print(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT} ...")
    try:
        client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        collections = client.get_collections()
        names = [collection.name for collection in collections.collections]
        print(f"✅ Qdrant is reachable. Collections: {names or '(none yet)'}")
        return 0
    except Exception as error:
        print(f"❌ Qdrant connection failed: {error}", file=sys.stderr)
        print(
            "\nStart Qdrant with: docker compose up -d qdrant",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
