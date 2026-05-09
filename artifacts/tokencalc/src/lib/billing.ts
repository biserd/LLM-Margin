const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${basePath}/api${path}`;
}

export type LookupKey = "pro_monthly" | "pro_annual";

export async function startCheckout(lookupKey: LookupKey): Promise<void> {
  const res = await fetch(apiUrl("/stripe/checkout"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ lookupKey }),
  });
  if (res.status === 401) {
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.href = `${basePath}/sign-in?next=${next}&plan=${lookupKey}`;
    return;
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error ?? `Checkout failed (${res.status})`);
  }
  const data = (await res.json()) as { url: string };
  window.location.href = data.url;
}

export async function openBillingPortal(): Promise<void> {
  const res = await fetch(apiUrl("/stripe/portal"), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error ?? `Portal failed (${res.status})`);
  }
  const data = (await res.json()) as { url: string };
  window.location.href = data.url;
}
