export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function isAuthHttpStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export function asHttpError(error: unknown): HttpError | null {
  if (error instanceof HttpError) {
    return error;
  }
  return null;
}