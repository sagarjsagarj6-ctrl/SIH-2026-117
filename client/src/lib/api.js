export const apiRequest = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const error = new Error(data?.error || `Request failed with status ${response.status}.`);
      error.status = response.status;
      error.requestId = data?.requestId || response.headers.get('X-Request-ID') || '';
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The local API did not respond in time. Check that the backend is running.');
      timeoutError.code = 'API_TIMEOUT';
      throw timeoutError;
    }
    if (error instanceof TypeError || error.message === 'Failed to fetch') {
      let origin = url;
      try {
        origin = new URL(url, window.location.origin).origin;
      } catch {
        // Keep the original URL when it cannot be parsed in a test/runtime shell.
      }
      const unavailableError = new Error(
        `Cannot reach the local API at ${origin}. Start the backend with "cd server; npm run dev", then try again.`
      );
      unavailableError.code = 'API_UNAVAILABLE';
      unavailableError.endpoint = origin;
      throw unavailableError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
