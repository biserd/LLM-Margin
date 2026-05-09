import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth, requestOtpCode, verifyOtpCode } from "@/lib/auth";

function getQuery() {
  if (typeof window === "undefined")
    return { next: "/account", prefilledEmail: "", upgraded: false };
  const params = new URLSearchParams(window.location.search);
  return {
    next: params.get("next") || "/account",
    prefilledEmail: params.get("email") || "",
    upgraded: params.get("upgraded") === "1",
  };
}

type Step = "email" | "code";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { user, refresh } = useAuth();
  const initial = getQuery();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initial.prefilledEmail);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    initial.upgraded
      ? "Thanks for your purchase! Enter your email and verify with a code to access your account."
      : null,
  );

  useEffect(() => {
    if (!user) return;
    setLocation(initial.next, { replace: true });
  }, [user, setLocation, initial.next]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    try {
      await requestOtpCode(email.trim());
      setInfo(`We sent a 6-digit code to ${email.trim()}.`);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeSubmit(submittedCode?: string) {
    const value = (submittedCode ?? code).trim();
    setError(null);
    if (!/^\d{6}$/.test(value)) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyOtpCode(email.trim(), value);
      await refresh();
      setLocation(initial.next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await requestOtpCode(email.trim());
      setInfo("We sent a new code. Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUseDifferentEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setInfo(null);
  }

  return (
    <>
      <title>Sign in | LLM Margin</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md border border-border rounded-2xl bg-card shadow-sm p-8">
          {step === "email" ? (
            <>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Sign in to LLM Margin
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send you a one-time code. No password needed.
              </p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                    data-testid="input-email"
                  />
                </div>
                {error && (
                  <p
                    className="text-sm text-red-600"
                    data-testid="text-error"
                  >
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                  data-testid="button-send-code"
                >
                  {submitting ? "Sending…" : "Send me a code"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Enter your code
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {info ?? `We sent a 6-digit code to ${email}.`}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCodeSubmit();
                }}
                className="space-y-5"
              >
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => {
                      setCode(value);
                      if (value.length === 6 && !submitting) {
                        handleCodeSubmit(value);
                      }
                    }}
                    disabled={submitting}
                    data-testid="input-otp"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p
                    className="text-sm text-red-600 text-center"
                    data-testid="text-error"
                  >
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || code.length !== 6}
                  data-testid="button-verify"
                >
                  {submitting ? "Verifying…" : "Verify and sign in"}
                </Button>
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={handleResend}
                    disabled={submitting}
                    data-testid="button-resend"
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleUseDifferentEmail}
                    disabled={submitting}
                    data-testid="button-use-different-email"
                  >
                    Use a different email
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
