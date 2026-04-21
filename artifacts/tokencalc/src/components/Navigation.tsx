import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Margin Simulator" },
    { href: "/cost-per-user", label: "Cost Per User" },
    { href: "/budget-planner", label: "Budget Planner" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">TC</div>
          TokenCalc
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
        <div>
          <Link href="/pricing">
            <Button variant="default" size="sm" className="hidden md:inline-flex" data-testid="button-get-pro">
              Get Pro
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
