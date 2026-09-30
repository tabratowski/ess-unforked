let cachedCsrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;
  const res = await fetch("/api/csrf");
  if (!res.ok) throw new Error("Failed to fetch CSRF token");
  const { csrfToken } = await res.json();
  cachedCsrfToken = csrfToken as string;
  // Clear cache after 55 minutes (tokens expire after 1 hour)
  setTimeout(
    () => {
      cachedCsrfToken = null;
    },
    55 * 60 * 1000,
  );
  return cachedCsrfToken!;
}

/**
 * Calls an internal Next.js API route with the required headers
 * that mark the request as originating from this frontend.
 * Automatically fetches and attaches a CSRF token.
 */
export async function internalFetch(
  path: string,
  body?: unknown,
  options?: RequestInit,
): Promise<Response> {
  const csrfToken = await getCsrfToken();

  return fetch(path, {
    method: "POST",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-internal-request": "1",
      "x-csrf-token": csrfToken,
      ...(options?.headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
