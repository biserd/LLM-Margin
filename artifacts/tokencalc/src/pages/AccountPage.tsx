import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();

  async function handleSignOut() {
    await signOut();
    setLocation("/", { replace: true });
  }

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
        <p className="text-muted-foreground text-sm mt-2">Plan: Free</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-6 w-full"
          onClick={handleSignOut}
          data-testid="button-sign-out"
        >
          Sign out
        </Button>
        <p className="text-xs text-muted-foreground/70 mt-4">
          Billing management coming soon.
        </p>
      </div>
    </>
  );
}
