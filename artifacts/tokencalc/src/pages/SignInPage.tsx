import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <>
      <title>Sign in | TokenCalc</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-10">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
        />
      </div>
    </>
  );
}
