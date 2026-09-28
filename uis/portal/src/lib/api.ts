import { FIXTURE_CUSTOMERS, FIXTURE_SALES } from "./fixtures";
import { normalizeCustomer, normalizeSales } from "./normalize";
import type { CustomerAccount, DataSource, LoadResult, LocationSales } from "./types";

export type PortalEnv = {
  BRASALAND_DATA_SOURCE?: string;
  NEXT_PUBLIC_BRASALAND_DATA_SOURCE?: string;
  BRASALAND_API_BASE_URL?: string;
  NEXT_PUBLIC_BRASALAND_API_BASE_URL?: string;
  BRASALAND_API_TOKEN?: string;
  [key: string]: string | undefined;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

export function resolveDataSource(env: PortalEnv = process.env): DataSource {
  const raw = (env.BRASALAND_DATA_SOURCE ?? env.NEXT_PUBLIC_BRASALAND_DATA_SOURCE ?? "mock")
    .trim()
    .toLowerCase();
  return raw === "live" ? "live" : "mock";
}

export function resolveBaseUrl(env: PortalEnv = process.env): string {
  const raw = env.BRASALAND_API_BASE_URL ?? env.NEXT_PUBLIC_BRASALAND_API_BASE_URL ?? DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

function authHeaders(env: PortalEnv): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = env.BRASALAND_API_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type LoaderDeps = {
  env?: PortalEnv;
  fetchImpl?: FetchLike;
};

class ApiStatusError extends Error {
  status: number;

  constructor(status: number) {
    super(`Brasaland API returned ${status}`);
    this.status = status;
  }
}

async function fetchJson(path: string, deps: LoaderDeps): Promise<unknown> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(`${resolveBaseUrl(env)}${path}`, {
    headers: authHeaders(env),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new ApiStatusError(response.status);
  return response.json() as Promise<unknown>;
}

const FIXTURE_NOTICE =
  "The live Brasaland API did not respond. Showing fixture data instead.";

export async function loadSales(deps: LoaderDeps = {}): Promise<LoadResult<LocationSales[]>> {
  const env = deps.env ?? process.env;
  if (resolveDataSource(env) !== "live") {
    return { data: FIXTURE_SALES, source: "mock" };
  }
  try {
    const body = await fetchJson("/sales", { ...deps, env });
    const rows = normalizeSales(body);
    if (rows.length === 0) {
      throw new Error("Brasaland API /sales returned no location rows");
    }
    return { data: rows, source: "live" };
  } catch {
    return {
      data: FIXTURE_SALES,
      source: "mock",
      notice: FIXTURE_NOTICE,
    };
  }
}

function customersFromList(body: unknown): CustomerAccount[] {
  const rows = Array.isArray(body)
    ? body
    : isCustomersEnvelope(body)
      ? body.customers
      : [];
  return rows.flatMap((row) => {
    const account = normalizeCustomer(row);
    return account ? [account] : [];
  });
}

function isCustomersEnvelope(body: unknown): body is { customers: unknown[] } {
  return typeof body === "object" && body !== null && Array.isArray((body as { customers?: unknown }).customers);
}

export async function loadCustomers(deps: LoaderDeps = {}): Promise<LoadResult<CustomerAccount[]>> {
  const env = deps.env ?? process.env;
  if (resolveDataSource(env) !== "live") {
    return { data: FIXTURE_CUSTOMERS, source: "mock" };
  }
  try {
    const body = await fetchJson("/customers", { ...deps, env });
    return { data: customersFromList(body), source: "live" };
  } catch {
    return {
      data: FIXTURE_CUSTOMERS,
      source: "mock",
      notice: FIXTURE_NOTICE,
    };
  }
}

export async function loadCustomer(
  customerId: string,
  deps: LoaderDeps = {},
): Promise<LoadResult<CustomerAccount | null>> {
  const env = deps.env ?? process.env;
  if (resolveDataSource(env) !== "live") {
    const found = findInFixtures(customerId);
    return { data: found, source: "mock" };
  }
  try {
    const body = await fetchJson(`/customers/${encodeURIComponent(customerId)}`, { ...deps, env });
    const account = normalizeCustomer(body);
    if (!account) throw new Error("unreadable customer");
    return { data: account, source: "live" };
  } catch (error) {
    if (error instanceof ApiStatusError && error.status === 404) {
      try {
        const listed = customersFromList(await fetchJson("/customers", { ...deps, env }));
        return { data: findAccount(listed, customerId), source: "live" };
      } catch (listError) {
        if (listError instanceof ApiStatusError) {
          return { data: null, source: "live" };
        }
      }
    }
    return {
      data: findInFixtures(customerId),
      source: "mock",
      notice: FIXTURE_NOTICE,
    };
  }
}

function findInFixtures(query: string): CustomerAccount | null {
  return findAccount(FIXTURE_CUSTOMERS, query);
}

export function findAccount(accounts: CustomerAccount[], query: string): CustomerAccount | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  return (
    accounts.find((account) => account.id.toLowerCase() === needle) ??
    accounts.find((account) => account.email.toLowerCase() === needle) ??
    accounts.find((account) => account.name.toLowerCase() === needle) ??
    null
  );
}
