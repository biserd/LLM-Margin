import { useEffect } from "react";
import { Redirect, useLocation } from "wouter";

export default function SignUpPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/sign-in", { replace: true });
  }, [setLocation]);

  return (
    <>
      <title>Create your account | LLM Margin</title>
      <meta name="robots" content="noindex, nofollow" />
      <Redirect to="/sign-in" />
    </>
  );
}
