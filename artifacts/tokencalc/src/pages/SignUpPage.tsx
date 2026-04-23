import { SignUp } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  return (
    <>
      <title>Create your account | TokenCalc</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-10">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
        />
      </div>
    </>
  );
}
