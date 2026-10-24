export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <title>Privacy Policy — LLM Margin</title>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: October 24, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-2">The short version</h2>
            <p className="text-muted-foreground">
              Browser calculations run locally. The quote builder can keep an unsaved draft in this browser tab’s
              session storage. When you save a quote, its inputs, project scope, business and client names are stored
              privately in your account on Cloudflare. Public API and agent estimates are processed on our server
              but their inputs are not saved as quotes. We do not sell your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">1. Information we collect</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Usage information:</strong> Google Analytics measures page views and product actions such as
              saving a draft and opening checkout. We do not intentionally send quote contents, client names,
              email addresses, or checkout query parameters in these events. Cloudflare processes request information
              and operational logs for hosting, security, and rate limiting.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>From account holders:</strong> Your email address, sign-in information, saved quotes, and
              authorized agent connections. Purchases also record Stripe identifiers, payment status, and export
              entitlement. Stripe handles payment card details; they are not stored in our database.
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
              We use Cloudflare Workers, D1, KV, and Email Sending for hosting, saved data, agent authorization,
              and sign-in emails; Stripe for payments; Google Analytics for usage measurement; and OpenRouter for
              public model pricing. Price requests do not include quote contents. Agents you explicitly authorize
              can receive your quote data according to the approved scopes. Each service maintains its own privacy policy.
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
              First-party cookies maintain your sign-in and bind OAuth consent to your browser. Google Analytics
              may use analytics cookies. The quote builder uses session storage for draft recovery. You can revoke
              connected agents in your account and clear browser storage using your browser settings.
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
