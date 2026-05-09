import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { openBillingPortal } from "@/lib/billing";

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AccountPage() {
  const { user, signOut, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUpgraded, setJustUpgraded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1") {
      setJustUpgraded(true);
      // Webhook may take a beat; poll a few times.
      let tries = 0;
      const tick = () => {
        tries += 1;
        refresh();
        if (tries < 6) setTimeout(tick, 1500);
      };
      tick();
      // Clean URL.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refresh]);

  async function handleSignOut() {
    await signOut();
    setLocation("/", { replace: true });
  }

  async function handleManage() {
    setError(null);
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open portal.");
      setPortalLoading(false);
    }
  }

  const isPro = user?.plan === "pro";
  const intervalLabel =
    user?.subscriptionInterval === "year"
      ? "annual"
      : user?.subscriptionInterval === "month"
        ? "monthly"
        : null;
  const renewsOn = formatDate(user?.currentPeriodEnd ?? null);

  return (
    <>
      <title>Your account | LLM Margin</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg bg-card">
        <h1 className="text-xl font-semibold mb-4 text-foreground">
          Your account
        </h1>
        <p
          className="text-muted-foreground text-sm"
          data-testid="text-account-email"
        >
          Signed in as: {user?.email ?? "—"}
        </p>

        <div className="mt-4 p-4 rounded-md border bg-muted/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Plan
              </p>
              <p
                className="text-base font-semibold text-foreground"
                data-testid="text-account-plan"
              >
                {isPro
                  ? `Pro${intervalLabel ? ` (${intervalLabel})` : ""}`
                  : "Free"}
              </p>
              {isPro && renewsOn && (
                <p className="text-xs text-muted-foreground mt-1">
                  {user?.subscriptionStatus === "canceled" ||
                  user?.subscriptionStatus === "unpaid"
                    ? `Ends on ${renewsOn}`
                    : `Renews on ${renewsOn}`}
                </p>
              )}
            </div>
            {isPro ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManage}
                disabled={portalLoading}
                data-testid="button-manage-billing"
              >
                {portalLoading ? "Opening…" : "Manage billing"}
              </Button>
            ) : (
              <Link href="/pricing">
                <Button size="sm" data-testid="button-upgrade">
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
          {justUpgraded && isPro && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-3">
              You're on Pro. Welcome aboard.
            </p>
          )}
          {justUpgraded && !isPro && (
            <p className="text-xs text-muted-foreground mt-3">
              Activating your subscription… this can take a few seconds.
            </p>
          )}
          {error && (
            <p
              className="text-xs text-red-600 mt-3"
              data-testid="text-portal-error"
            >
              {error}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-6 w-full"
          onClick={handleSignOut}
          data-testid="button-sign-out"
        >
          Sign out
        </Button>
      </div>
    </>
  );
}
