import { Redirect } from "wouter";
import { useAuth } from "@/lib/auth";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}
