/**
 * Maps YouTube Data API v3 JSON error bodies to short UI-safe strings (no raw JSON).
 */

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** True if the raw body or message indicates quota exhaustion. */
export function isYoutubeQuotaErrorText(text: string): boolean {
  const t = text.toLowerCase();
  const compact = t.replace(/\s+/g, "");
  return (
    /quotaexceeded|dailylimitexceeded|exceeded your quota|youtube\.quota/.test(t) ||
    /youtubedataapiquotaexceeded/.test(compact) ||
    (t.includes("exceeded") && t.includes("quota"))
  );
}

/**
 * Use for any string that might be raw JSON, HTML, or plain text from YouTube APIs.
 */
export function sanitizeYoutubeErrorForUi(
  input: string | undefined | null,
  httpStatus = 403,
): string {
  if (input == null) return "";
  const t = input.trim();
  if (!t) return "";
  if (t.startsWith("{") || t.startsWith("[")) {
    return formatYoutubeDataApiErrorBody(t, httpStatus);
  }
  if (isYoutubeQuotaErrorText(t)) {
    return "YouTube Data API quota exceeded. Try again later or raise the daily quota in Google Cloud Console.";
  }
  return t.length > 300 ? `${t.slice(0, 280)}…` : t;
}

export function formatYoutubeDataApiErrorBody(
  rawBody: string,
  httpStatus: number,
): string {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    return `YouTube API request failed (${httpStatus}).`;
  }

  // Regex before JSON.parse — handles truncated JSON, HTML in messages, etc.
  if (isYoutubeQuotaErrorText(trimmed)) {
    return "YouTube Data API quota exceeded. Try again later or raise the daily quota in Google Cloud Console.";
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: {
        code?: number;
        message?: string;
        errors?: Array<{ reason?: string; message?: string }>;
      };
    };
    const err = parsed.error;
    const reason = err?.errors?.[0]?.reason;
    const rawMsg = err?.message?.trim();
    const apiMessage = rawMsg ? stripHtml(rawMsg) : "";

    if (
      reason === "quotaExceeded" ||
      reason === "dailyLimitExceeded" ||
      isYoutubeQuotaErrorText(apiMessage)
    ) {
      return "YouTube Data API quota exceeded. Try again later or raise the daily quota in Google Cloud Console.";
    }
    if (reason === "rateLimitExceeded") {
      return "YouTube API rate limit — wait a minute and try again.";
    }
    if (reason === "accessNotConfigured") {
      return "YouTube Data API is not enabled for this project. Enable it in Google Cloud Console.";
    }
    if (httpStatus === 401 || reason === "authError") {
      return "YouTube authorization expired. Sign out and sign in with Google again.";
    }
    if (httpStatus === 403 && (reason === "forbidden" || !reason)) {
      return "YouTube API denied this request (403). Check API key, OAuth scopes, and quota.";
    }
    if (apiMessage && apiMessage.length < 180) {
      return apiMessage;
    }
    return `YouTube API error (${httpStatus}).`;
  } catch {
    if (trimmed.length < 160 && !trimmed.startsWith("{")) {
      return trimmed;
    }
    if (isYoutubeQuotaErrorText(trimmed)) {
      return "YouTube Data API quota exceeded. Try again later or raise the daily quota in Google Cloud Console.";
    }
    return `YouTube API error (${httpStatus}).`;
  }
}
