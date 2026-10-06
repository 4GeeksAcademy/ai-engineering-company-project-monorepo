import { SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";
import type { CookieOptionsWithName, CookieMethodsServer, CookieMethodsServerDeprecated } from "./types";
/**
 * @deprecated Please specify `getAll` and `setAll` cookie methods instead of
 * the `get`, `set` and `remove`. These will not be supported in the next major
 * version.
 */
export declare function createServerClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<SchemaName> & {
    cookieOptions?: CookieOptionsWithName;
    cookies: CookieMethodsServerDeprecated;
    cookieEncoding?: "raw" | "base64url";
}): SupabaseClient<Database, SchemaName>;
/**
 * Creates a Supabase Client for use on the server-side of a server-side
 * rendering (SSR) framework.
 *
 * **Use in middlewares.**
 *
 * Middlewares are functions that run before any rendering logic and can
 * inspect and modify both the incoming request and the outgoing response. In
 * most SSR frameworks you *must set up a middleware* and call this function
 * in it. The `cookies` option must implement both `getAll` **and** `setAll`
 * so that token refreshes can be written back to the response. The deprecated
 * `get`, `set`, and `remove` methods are not recommended — they miss
 * important edge cases and will be removed in a future major version.
 *
 * **IMPORTANT:** Failing to implement `getAll` and `setAll` correctly **will
 * cause significant and difficult to debug authentication issues**: random
 * logouts, early session termination, JSON parsing errors, increased refresh
 * token requests, or relying on garbage state.
 *
 * **Use in pages, routes or components.**
 *
 * *Always* create a new client with this function for each server render —
 * never share a client across requests. Not all frameworks allow setting
 * cookies or response headers from pages, routes or components — in those
 * cases `setAll` can be omitted, but configure it if you can.
 *
 * **IMPORTANT:** If cookies cannot be set from pages or components,
 * middleware *must* handle session updates — omitting it will cause
 * significant and difficult to debug authentication issues.
 *
 * If `setAll` is not configured, the client emits a warning when it needs to
 * write cookies. This usually means one of:
 *
 * - A middleware client was not configured.
 * - There is a bug in your middleware.
 * - You are calling `supabase.auth.updateUser()` server-side.
 *
 * Please consult the [Supabase SSR guides](https://supabase.com/docs/guides/auth/server-side)
 * for your framework.
 *
 * **Session initialization.**
 *
 * This client uses lazy session initialization (`skipAutoInitialize: true`).
 * The session is not loaded until the first call to `getSession()` or
 * `getUser()`. Token refreshes write the updated session back to cookies via
 * the `setAll` handler.
 *
 * @param supabaseUrl The URL of the Supabase project.
 * @param supabaseKey The `anon` API key of the Supabase project.
 * @param options Various configuration options.
 */
export declare function createServerClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<SchemaName> & {
    cookieOptions?: CookieOptionsWithName;
    cookies: CookieMethodsServer;
    cookieEncoding?: "raw" | "base64url";
}): SupabaseClient<Database, SchemaName>;
