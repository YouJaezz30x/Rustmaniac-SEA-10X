export async function getCsrfToken(): Promise<string> {
  const res = await fetch("/api/csrf", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch CSRF token");
  const data = (await res.json()) as { token: string };
  return data.token;
}

export async function csrfFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await getCsrfToken();
  const headers = new Headers(init.headers);
  headers.set("x-csrf-token", token);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers, credentials: "include" });
}
