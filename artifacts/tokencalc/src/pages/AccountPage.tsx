import { useUser } from "@clerk/react";

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";

  return (
    <>
      <title>Your account | TokenCalc</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg bg-card">
        <h1 className="text-xl font-semibold mb-4 text-foreground">
          Your account
        </h1>
        <p className="text-muted-foreground text-sm" data-testid="text-account-email">
          Signed in as: {isLoaded ? email || "—" : "…"}
        </p>
        <p className="text-muted-foreground text-sm mt-2">Plan: Free</p>
        <p className="text-xs text-muted-foreground/70 mt-6">
          Billing management coming soon.
        </p>
      </div>
    </>
  );
}
