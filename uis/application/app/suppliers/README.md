# Supplier directory UI

Page for the Brasaland supplier directory. Served at `/application/app/suppliers/`.

Fields, categories, and statuses come from [`CONTEXT.md`](../../../../CONTEXT.md). The page calls `GET`/`POST`/`PATCH /suppliers` on the FastAPI app in [`services/api/main.py`](../../../../services/api/main.py).
