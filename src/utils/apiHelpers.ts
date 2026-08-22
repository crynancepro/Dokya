/**
 * Helper utility for robust API fetching with automatic retries and timeouts
 */

/**
 * Safely parses a Fetch Response as JSON.
 * Checks content-type header and response status.
 * Handles HTML error pages (e.g. Vercel 404/500) gracefully to prevent "Unexpected token" JSON parse errors.
 */
export async function safeParseJsonResponse<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    const htmlText = await response.text().catch(() => '');
    console.error(`[API Non-JSON Response ${response.status}]:`, htmlText.slice(0, 300));
    throw new Error(
      `Erreur Serveur (${response.status || 500}) : Vérifiez la configuration des variables d'environnement sur Vercel.`
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch (parseError) {
    console.error(`[API JSON Parse Error ${response.status}]`);
    throw new Error(
      `Erreur Serveur (${response.status || 500}) : Vérifiez la configuration des variables d'environnement sur Vercel.`
    );
  }

  if (!response.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      `Erreur Serveur (${response.status}) : Vérifiez la configuration des variables d'environnement sur Vercel.`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<Response> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      // 60-second timeout per chapter or payment request
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // Retry on 5xx server errors or 429 rate limit errors
      if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
        console.warn(`[FetchWithRetry] Attempt ${attempt} for ${url} returned ${response.status}. Retrying in ${delayMs * attempt}ms...`);
        await new Promise((r) => setTimeout(r, delayMs * attempt));
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      const isAbort = err.name === 'AbortError';
      const msg = isAbort ? 'Délai d\'attente dépassé (Timeout)' : err.message;
      console.warn(`[FetchWithRetry] Attempt ${attempt}/${maxRetries} for ${url} failed (${msg}).`);

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error(`Impossible de contacter le serveur (${url}). Vérifiez votre connexion internet.`);
}

