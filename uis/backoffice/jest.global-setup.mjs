// Runs once, in the parent process, before any test worker starts (so they inherit it). The backoffice shows dates in the
// user's timezone: pinning one keeps the date tests identical on every machine and in CI.
export default async function globalSetup() {
  process.env.TZ = "Europe/Madrid";
}
