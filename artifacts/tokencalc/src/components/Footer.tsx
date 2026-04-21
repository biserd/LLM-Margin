import { Link } from "wouter";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-card/30 mt-12">
      <div className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-base mb-2">
              <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">TC</div>
              TokenCalc
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Honest unit economics for AI-powered SaaS founders.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-3">Tools</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Margin Simulator</Link></li>
              <li><Link href="/cost-per-user" className="text-muted-foreground hover:text-primary transition-colors">Cost Per User</Link></li>
              <li><Link href="/budget-planner" className="text-muted-foreground hover:text-primary transition-colors">Budget Planner</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {year} TokenCalc. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Prices via OpenRouter. Estimates only — verify with your provider.
          </p>
        </div>
      </div>
    </footer>
  );
}
