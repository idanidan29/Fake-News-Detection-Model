const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

type ApiErrorPayload = {
  detail?: string | { msg?: string }[];
};

function normalizeErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
  if (!payload?.detail) {
    return fallback;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (Array.isArray(payload.detail) && payload.detail.length > 0) {
    return payload.detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join(" ");
  }

  return fallback;
}

export async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(
      `Could not reach the API at ${API_BASE_URL}. Make sure the backend server is running.`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? ((await response.json()) as ApiErrorPayload | T) : null;

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}.`;
    throw new Error(normalizeErrorMessage(payload as ApiErrorPayload | null, fallback));
  }

  if (!isJson) {
    throw new Error("The backend returned an unexpected response format.");
  }

  return payload as T;
}
