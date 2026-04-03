/**
 * Railway / server logs — grep for `[vid]`.
 * Never log secrets, refresh tokens, or OAuth codes.
 */

const PREFIX = "[vid]";

function safeJson(data: Record<string, unknown>): string {
  try {
    return JSON.stringify(data);
  } catch {
    return "{}";
  }
}

export function vidLog(
  area: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (data) {
    console.log(`${PREFIX} [${area}] ${message} ${safeJson(data)}`);
  } else {
    console.log(`${PREFIX} [${area}] ${message}`);
  }
}

export function vidError(
  area: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (data) {
    console.error(`${PREFIX} [${area}] ${message} ${safeJson(data)}`);
  } else {
    console.error(`${PREFIX} [${area}] ${message}`);
  }
}
