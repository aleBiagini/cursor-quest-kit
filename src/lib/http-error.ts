export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function forbidden(message = "Forbidden", details?: unknown): never {
  throw new HttpError(403, message, details);
}

export function notFound(message = "Not found"): never {
  throw new HttpError(404, message);
}

export function conflict(message = "Conflict", details?: unknown): never {
  throw new HttpError(409, message, details);
}

export function badRequest(message = "Bad request", details?: unknown): never {
  throw new HttpError(400, message, details);
}
