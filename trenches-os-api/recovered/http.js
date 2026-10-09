function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers
    }
  });
}
__name(json, "json");
function errorResponse(code, message, status = 400, details) {
  return json({ error: { code, message, ...details === void 0 ? {} : { details } } }, status);
}
__name(errorResponse, "errorResponse");
async function readJsonObject(request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  }
  let value;
  try {
    value = await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must contain valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_BODY", "Request body must be a JSON object.");
  }
  return value;
}
__name(readJsonObject, "readJsonObject");
var HttpError = class extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  status;
  code;
  details;
  static {
    __name(this, "HttpError");
  }
};

