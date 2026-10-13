Add the inventory API on SQLModel with Supabase as a second database

Operations needs a central inventory of equipment and materials, and the
tech lead's decision is two stores in one FastAPI app: TinyDB keeps users
and authentication, while assets and their orders move to PostgreSQL
(Supabase) through SQLModel. The one hard rule: stock is never edited, it
only changes by registering an inbound or an outbound order, and every order
is traceable to the user who made it.

Data model and rules
- Add Asset, AssetEntry and AssetExit (names and fields from the Hito 5
  CONTEXT) with foreign keys to assets, a UNIQUE sku and CHECK constraints
  on quantities and on assigned_to versus exit_type
- Derive current_stock as entries minus exits, bounded by office, in a single
  statement; it exists only in responses, never as a column
- Reject an outbound order above the stock with HTTP 400 before writing,
  locking the asset row with FOR UPDATE on PostgreSQL
- Require assigned_to for an allocation and null for a consumption (422)
- Store the authenticated TinyDB user id in user_uuid, never taken from the
  request body, with no users table and no foreign key on that column

API
- Add routers/inventory.py: APIRouter(prefix="/inventory") with products
  (list, create, get) and orders (inbound, outbound, list), all behind
  get_current_user and with no PUT, PATCH or DELETE on stock
- Keep Pydantic schemas in their own file; no endpoint returns an ORM object
- Load related data in the same statement: one query for products, two for
  orders, so there is no N+1
- Inject one SQL session per request with Depends(get_db); no global session

Configuration and data
- Read DATABASE_URL (Supabase Transaction pooler) from .env, normalise the
  scheme and percent-encode the password for psycopg2, and fall back to a
  local SQLite file for development; .env stays out of git
- Start both connections and create the schema at application startup
- Add the CONTEXT seed data and the `seed-inventory` command; the seeded
  stock is the net of entries minus exits (12, 5, 26, 25, 80, 40)
- Depend on sqlmodel and psycopg2-binary; no direct SQLAlchemy imports

Verification
- Add 58 tests for the rules, the N+1 query counts, the database
  constraints, access control and configuration; the suite is at 724 passed
- Check the live Supabase database: tables, constraints, seed and the
  400, 409, 422 and 401 answers

Delivered in pull requests #16 and #17.
