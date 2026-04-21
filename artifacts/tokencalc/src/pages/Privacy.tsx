export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <title>Privacy Policy — TokenCalc</title>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: April 21, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-2">The short version</h2>
            <p className="text-muted-foreground">
              All calculator inputs stay in your browser. We do not have a backend that stores your scenarios on
              the free tier. If you upgrade to Pro, we collect the minimum information required to provide a
              subscription (email + Stripe customer ID). We do not sell your data, ever.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">1. Information we collect</h2>
            <p className="text-muted-foreground mb-2">
              <strong>From everyone:</strong> Anonymous, aggregated usage analytics (page views, button clicks,
              referrer) so we can improve the product. No personally identifying information is attached to these
              events.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>From Pro subscribers:</strong> Your email address, Stripe customer ID, subscription status,
              and any scenarios you choose to save to your account. Payment details are handled exclusively by
              Stripe — we never see your card information.
            </p>
            <p className="text-muted-foreground">
              <strong>From contact form submissions:</strong> Your name, email, and message content, used solely
              to respond to your inquiry.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. How we use information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>To provide the Service and operate your subscription</li>
              <li>To respond to support requests</li>
              <li>To send transactional emails (receipts, password resets, subscription updates)</li>
              <li>To send product update emails (you can opt out at any time)</li>
              <li>To detect and prevent abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. What we do not do</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Sell or rent your personal information to third parties</li>
              <li>Run third-party advertising on the Service</li>
              <li>Track you across the web after you leave</li>
              <li>Look at your saved scenarios for any purpose other than rendering them back to you</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Third-party services</h2>
            <p className="text-muted-foreground">
              We use Stripe for payment processing, OpenRouter for live model pricing (we send no user data —
              only public price requests), and a transactional email provider for receipts and updates. Each
              maintains its own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Data retention</h2>
            <p className="text-muted-foreground">
              Saved scenarios are retained as long as your account exists. After you delete your account, we
              purge personal data within 30 days, except where retention is legally required (e.g., billing
              records for tax purposes).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Your rights</h2>
            <p className="text-muted-foreground">
              You can request access, correction, or deletion of your personal data at any time by contacting us.
              EU/UK residents have additional rights under GDPR; California residents have rights under the CCPA.
              We honor all valid requests.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Cookies</h2>
            <p className="text-muted-foreground">
              We use a minimal set of first-party cookies for session management and Pro authentication. We do
              not use third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Contact</h2>
            <p className="text-muted-foreground">
              Privacy questions or requests? <a href="/contact" className="text-primary hover:underline">Contact us</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
