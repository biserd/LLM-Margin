export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <title>Terms of Service — LLM Margin</title>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: October 24, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Acceptance of terms</h2>
            <p className="text-muted-foreground">
              By accessing or using LLM Margin ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Description of service</h2>
            <p className="text-muted-foreground">
              LLM Margin provides AI service pricing calculators, private quote drafts, client proposal exports,
              and agent interfaces. Browser and server calculations use the supplied assumptions. Results are
              estimates, not guaranteed prices or profits. Proposal exports are not signed contracts or professional advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. No warranty</h2>
            <p className="text-muted-foreground">
              The Service is provided "as is" without warranty of any kind. Pricing data is sourced from third-party
              APIs and may not reflect current rates. We do not guarantee accuracy, completeness, or fitness for
              any particular purpose. You are solely responsible for verifying any pricing or calculation before
              making business decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Purchases and existing subscriptions</h2>
            <p className="text-muted-foreground">
              One quote export costs $29 USD, paid once through Stripe, and covers that saved quote and its revisions.
              Free accounts may save up to 100 private drafts. Existing Pro subscriptions retain their agreed billing
              terms and include quote export while active or trialing. You may cancel an existing subscription from
              your account and retain paid access through its billing period. Drafts remain accessible without a subscription;
              export requires an active entitlement. A fully refunded one-time purchase loses its export entitlement.
              Refunds are handled on a case-by-case basis — contact us within 14 days of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Acceptable use</h2>
            <p className="text-muted-foreground">
              You agree not to: (a) reverse-engineer or scrape the Service for commercial competitive purposes;
              (b) attempt to bypass paid feature gates by spoofing authentication tokens; (c) use the Service
              to violate any applicable law or third-party right.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Intellectual property</h2>
            <p className="text-muted-foreground">
              All content, branding, calculator logic, and copy on the Service are the property of LLM Margin.
              You retain ownership of any inputs or scenario data you create. By using the Service you grant us a
              limited license to display and process that data on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Limitation of liability</h2>
            <p className="text-muted-foreground">
              Under no circumstances shall LLM Margin, its operators, or affiliates be liable for any indirect,
              incidental, consequential, or special damages arising out of or in any way connected with use of
              the Service. Our total liability shall not exceed the amount you paid us in the twelve months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Changes to these terms</h2>
            <p className="text-muted-foreground">
              We may update these terms from time to time. Material changes will be communicated via the Service
              or by email to active subscribers. Continued use after changes take effect constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Contact</h2>
            <p className="text-muted-foreground">
              Questions about these terms? <a href="/contact" className="text-primary hover:underline">Contact us</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
