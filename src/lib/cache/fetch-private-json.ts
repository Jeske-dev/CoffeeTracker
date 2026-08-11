export async function fetchPrivateJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error(`Private request failed (${response.status})`);
  return response.json() as Promise<T>;
}
