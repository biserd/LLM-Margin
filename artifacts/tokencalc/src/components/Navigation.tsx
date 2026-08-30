import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

export function Navigation() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, signOut } = useAuth();

  const links = [
    { href: "/", label: "Margin Simulator" },
    { href: "/cost-per-user", label: "Cost Per User" },
    { href: "/budget-planner", label: "Budget Planner" },
    { href: "/tools", label: "Free Tools" },
    { href: "/llm-pricing", label: "LLM Prices" },
    { href: "/compare", label: "Compare" },
    { href: "/blog", label: "Blog" },
    { href: "/pricing", label: "Pricing" },
  ];

  async function handleSignOut() {
    await signOut();
    setLocation("/", { replace: true });
  }

  const initial = (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
            LM
          </div>
          LLM Margin
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === link.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div
              className="h-8 w-8 rounded-full bg-muted animate-pulse"
              aria-hidden="true"
            />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center hover:opacity-90 transition-opacity"
                  data-testid="button-user-menu"
                  aria-label="Account menu"
                >
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-xs text-muted-foreground">
                    Signed in as
                  </div>
                  <div
                    className="text-sm font-medium truncate"
                    data-testid="text-menu-email"
                  >
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setLocation("/account")}
                  data-testid="menu-item-account"
                >
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleSignOut}
                  data-testid="menu-item-sign-out"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-sign-in"
            >
              Sign in
            </Link>
          )}
          <Link href="/pricing">
            <Button
              variant="default"
              size="sm"
              className="hidden md:inline-flex"
              data-testid="button-get-pro"
            >
              Get Pro
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
