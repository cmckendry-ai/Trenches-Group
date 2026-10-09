async function secureEqual(a, b) {
  const encoder = new TextEncoder();
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b))
  ]);
  return crypto.subtle.timingSafeEqual(aHash, bHash);
}
__name(secureEqual, "secureEqual");
async function requireBearer(request, expected, notConfiguredCode) {
  if (!expected) throw new HttpError(503, notConfiguredCode, "Required secret is not configured.");
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "UNAUTHORIZED", "Missing bearer token.");
  const actual = header.slice("Bearer ".length);
  if (!await secureEqual(actual, expected)) throw new HttpError(401, "UNAUTHORIZED", "Invalid bearer token.");
}
__name(requireBearer, "requireBearer");
async function requireAdmin(request, env) {
  await requireBearer(request, env.ADMIN_API_KEY, "ADMIN_AUTH_NOT_CONFIGURED");
}
__name(requireAdmin, "requireAdmin");
async function requireProspectIngest(request, env) {
  await requireBearer(request, env.PROSPECT_INGEST_KEY, "PROSPECT_INGEST_NOT_CONFIGURED");
}
__name(requireProspectIngest, "requireProspectIngest");
async function requireRunner(request, env) {
  await requireBearer(request, env.RUNNER_API_KEY, "RUNNER_AUTH_NOT_CONFIGURED");
}
__name(requireRunner, "requireRunner");

