// Safe JSON parsing for fetch responses.
//
// Gemini-backed routes occasionally fail at the transport layer, not the app
// layer: when the upstream model is slow/overloaded the hosting function can hit
// its timeout and the platform returns a 502/504 with an empty or HTML body.
// Calling `res.json()` on that body throws "Unexpected end of JSON input", which
// is what surfaced to users (and cleared on retry, since it was transient).
//
// This helper reads the body as text first, parses defensively, and turns both
// non-OK responses and unparseable bodies into a single user-friendly Error.

function friendlyStatusMessage(status: number): string | null {
  if (status === 429) return "The AI service is rate-limited right now. Please wait a moment and try again.";
  if (status === 502 || status === 503) return "The AI service is temporarily overloaded. Please try again in a few seconds.";
  if (status === 504) return "The AI request timed out — your input may be large or the model is busy. Please try again.";
  return null;
}

// Parses a fetch Response as JSON, throwing an Error with a user-friendly message
// on non-OK status or an empty/non-JSON body.
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Body was present but not JSON (e.g. a gateway/proxy error page).
    }
  }

  if (!res.ok) {
    const fromBody = (data as { error?: string } | null)?.error;
    throw new Error(fromBody || friendlyStatusMessage(res.status) || `Request failed (${res.status}).`);
  }

  if (data === null) {
    throw new Error("The AI service returned an incomplete response. This is usually a temporary hiccup — please try again.");
  }

  return data as T;
}
