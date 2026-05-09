import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  stripe,
  STRIPE_WEBHOOK_SECRET,
  appBaseUrl,
  isAllowedLookupKey,
} from "../lib/stripe";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
} from "../lib/session";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function loadUser(userId: string) {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

async function ensureStripeCustomer(
  userId: string,
  email: string,
  existingCustomerId: string | null,
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  await db
    .update(usersTable)
    .set({ stripeCustomerId: customer.id })
    .where(eq(usersTable.id, userId));
  return customer.id;
}

router.post("/stripe/checkout", async (req, res) => {
  try {
    const lookupKey = req.body?.lookupKey;
    if (!isAllowedLookupKey(lookupKey)) {
      res.status(400).json({ error: "Invalid plan." });
      return;
    }

    const user = req.session ? await loadUser(req.session.userId) : null;

    // Logged-in dedupe: if user already has an active sub, send them to the
    // billing portal instead of creating a duplicate. Anonymous users skip
    // this check (Stripe collects their email at checkout, and the
    // /complete handler will reconcile against an existing user/customer).
    if (user?.stripeCustomerId) {
      const existing = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 10,
      });
      const liveSub = existing.data.find(
        (s) => s.status === "active" || s.status === "trialing",
      );
      if (liveSub) {
        const portal = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: `${appBaseUrl()}/account`,
        });
        res.status(200).json({ url: portal.url, alreadySubscribed: true });
        return;
      }
    }

    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
      expand: ["data.product"],
    });
    const price = prices.data[0];
    if (!price) {
      req.log.error({ lookupKey }, "Stripe price lookup returned no results");
      res.status(500).json({ error: "Pricing unavailable. Try again." });
      return;
    }

    const base = appBaseUrl();
    // Success URL goes through /api/stripe/checkout/complete so we can
    // (a) upsert the user from the Stripe-collected email,
    // (b) issue a session cookie immediately,
    // (c) apply subscription state without waiting for the webhook race.
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      // 7-day risk-free trial. Card is required up front
      // (`payment_method_collection: "always"`) so the subscription auto-
      // converts at trial end without re-engaging the user. If the user
      // cancels in the trial window they're never charged.
      payment_method_collection: "always",
      success_url: `${base}/api/stripe/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?canceled=1`,
      subscription_data: {
        trial_period_days: 7,
        metadata: user ? { userId: user.id } : {},
      },
      metadata: {
        lookupKey,
        ...(user ? { userId: user.id } : {}),
      },
    };

    if (user) {
      const customerId = await ensureStripeCustomer(
        user.id,
        user.email,
        user.stripeCustomerId,
      );
      params.customer = customerId;
      params.client_reference_id = user.id;
    }

    const session = await stripe.checkout.sessions.create(params);

    if (!session.url) {
      res.status(500).json({ error: "Could not create checkout session." });
      return;
    }
    res.status(200).json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "stripe/checkout failed");
    res.status(500).json({ error: "Could not start checkout." });
  }
});

router.get("/stripe/checkout/complete", async (req, res) => {
  const base = appBaseUrl();
  try {
    const sessionId = String(req.query["session_id"] ?? "");
    if (!sessionId.startsWith("cs_")) {
      res.redirect(`${base}/pricing?error=invalid_session`);
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      res.redirect(`${base}/pricing?error=payment_incomplete`);
      return;
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer?.id ?? null);

    const rawEmail =
      session.customer_details?.email ??
      (typeof session.customer === "object" && session.customer
        ? (session.customer as Stripe.Customer).email
        : null) ??
      "";
    const email = String(rawEmail).trim().toLowerCase();

    if (!customerId || !email) {
      req.log.error(
        { sessionId, customerId, hasEmail: Boolean(email) },
        "Checkout complete: missing customer or email on session",
      );
      res.redirect(`${base}/pricing?error=session_incomplete`);
      return;
    }

    // Look up an existing user by the email Stripe collected. We must NOT
    // auto-sign-in someone whose email matches an existing account — that
    // would let an attacker take over a victim's account by paying with the
    // victim's email at Stripe Checkout. Auto-sign-in is only safe when the
    // email is brand new (no account exists to take over).
    const existingRows = await db
      .select({
        id: usersTable.id,
        stripeCustomerId: usersTable.stripeCustomerId,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    const existing = existingRows[0] ?? null;
    const isNewUser = !existing;

    const now = new Date();
    let userId: string;
    if (existing) {
      userId = existing.id;
      // Only attach the new Stripe customer if the user has none — never
      // overwrite an existing linkage (the attacker would control the
      // overwritten customer).
      if (!existing.stripeCustomerId) {
        await db
          .update(usersTable)
          .set({ stripeCustomerId: customerId })
          .where(eq(usersTable.id, userId));
      }
    } else {
      const inserted = await db
        .insert(usersTable)
        .values({ email, lastLoginAt: now, stripeCustomerId: customerId })
        .returning({ id: usersTable.id });
      const newId = inserted[0]?.id;
      if (!newId) {
        throw new Error("Failed to create user during checkout completion");
      }
      userId = newId;
    }

    if (session.subscription) {
      const sub =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;

      // Backfill metadata.userId so future webhook events can resolve the user
      // even if the customer→user mapping ever gets out of sync.
      if (!sub.metadata?.["userId"]) {
        try {
          await stripe.subscriptions.update(sub.id, {
            metadata: { ...(sub.metadata ?? {}), userId },
          });
        } catch (err) {
          req.log.warn({ err }, "Could not write userId metadata onto sub");
        }
      }

      const subWithUser = {
        ...sub,
        metadata: { ...(sub.metadata ?? {}), userId },
      } as Stripe.Subscription;
      await applySubscription(subWithUser);
    }

    if (isNewUser) {
      // Safe to auto-sign-in: there was no prior account on this email.
      await db
        .update(usersTable)
        .set({ lastLoginAt: now })
        .where(eq(usersTable.id, userId));
      const { token, expiresAt } = createSessionToken(userId);
      res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
      res.redirect(`${base}/account?upgraded=1`);
      return;
    }

    // Existing account: payment was applied to that account, but the buyer
    // must prove they own the email via OTP before getting a session.
    const next = encodeURIComponent("/account?upgraded=1");
    const emailParam = encodeURIComponent(email);
    res.redirect(
      `${base}/sign-in?next=${next}&email=${emailParam}&upgraded=1`,
    );
  } catch (err) {
    req.log.error({ err }, "stripe/checkout/complete failed");
    res.redirect(`${base}/pricing?error=complete_failed`);
  }
});

router.post("/stripe/portal", requireAuth, async (req, res) => {
  try {
    const user = await loadUser(req.session!.userId);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!user.stripeCustomerId) {
      res.status(400).json({ error: "No active subscription." });
      return;
    }
    const base = appBaseUrl();
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${base}/account`,
    });
    res.status(200).json({ url: portal.url });
  } catch (err) {
    req.log.error({ err }, "stripe/portal failed");
    res.status(500).json({ error: "Could not open billing portal." });
  }
});

async function applySubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId =
    (sub.metadata && sub.metadata["userId"]) ||
    (await (async () => {
      const rows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.stripeCustomerId, customerId))
        .limit(1);
      return rows[0]?.id ?? null;
    })());
  if (!userId) {
    logger.warn(
      { customerId, subId: sub.id },
      "Webhook: no user found for stripe customer (likely anonymous checkout still in flight; the /complete handler will reconcile)",
    );
    return;
  }

  const item = sub.items.data[0];
  const interval = item?.price?.recurring?.interval ?? null;
  const subAny = sub as unknown as { current_period_end?: number };
  const itemAny = item as unknown as { current_period_end?: number } | undefined;
  const periodEnd =
    subAny.current_period_end ?? itemAny?.current_period_end ?? null;
  const isActive = sub.status === "active" || sub.status === "trialing";

  await db
    .update(usersTable)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      plan: isActive ? "pro" : "free",
      subscriptionStatus: sub.status,
      subscriptionInterval: interval,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    })
    .where(eq(usersTable.id, userId));
}

async function clearSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Don't blindly downgrade: another active subscription may still exist for
  // this customer. Re-derive entitlement from Stripe's current state.
  const live = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  const stillActive = live.data.find(
    (s) =>
      s.id !== sub.id && (s.status === "active" || s.status === "trialing"),
  );

  if (stillActive) {
    await applySubscription(stillActive);
    return;
  }

  await db
    .update(usersTable)
    .set({
      plan: "free",
      subscriptionStatus: sub.status,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    })
    .where(eq(usersTable.stripeCustomerId, customerId));
}

export const webhookRouter: IRouter = Router();

webhookRouter.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    if (!STRIPE_WEBHOOK_SECRET) {
      req.log.error("Webhook called but STRIPE_WEBHOOK_SECRET is not set");
      res.status(500).send("Webhook secret not configured");
      return;
    }
    const sig = req.headers["stripe-signature"];
    if (!sig || Array.isArray(sig)) {
      res.status(400).send("Missing signature");
      return;
    }
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      req.log.warn({ err }, "Stripe webhook signature verification failed");
      res
        .status(400)
        .send(
          `Webhook Error: ${err instanceof Error ? err.message : "invalid"}`,
        );
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.subscription) {
            const subId =
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription.id;
            const sub = await stripe.subscriptions.retrieve(subId);
            let userId =
              session.client_reference_id ||
              session.metadata?.["userId"] ||
              null;

            // Anonymous checkout fallback: if the buyer never returned to
            // /complete, we still want to provision a user so the entitlement
            // they paid for isn't lost. Upsert by the email Stripe collected.
            // We never issue a session here — the user must OTP-sign-in to
            // claim the account.
            if (!userId) {
              const customerId =
                typeof session.customer === "string"
                  ? session.customer
                  : (session.customer?.id ?? null);
              const email = String(session.customer_details?.email ?? "")
                .trim()
                .toLowerCase();
              if (customerId && email) {
                const found = await db
                  .select({
                    id: usersTable.id,
                    stripeCustomerId: usersTable.stripeCustomerId,
                  })
                  .from(usersTable)
                  .where(eq(usersTable.email, email))
                  .limit(1);
                if (found[0]) {
                  userId = found[0].id;
                  if (!found[0].stripeCustomerId) {
                    await db
                      .update(usersTable)
                      .set({ stripeCustomerId: customerId })
                      .where(eq(usersTable.id, userId));
                  }
                } else {
                  const inserted = await db
                    .insert(usersTable)
                    .values({ email, stripeCustomerId: customerId })
                    .onConflictDoNothing({ target: usersTable.email })
                    .returning({ id: usersTable.id });
                  if (inserted[0]) {
                    userId = inserted[0].id;
                  } else {
                    const reread = await db
                      .select({ id: usersTable.id })
                      .from(usersTable)
                      .where(eq(usersTable.email, email))
                      .limit(1);
                    userId = reread[0]?.id ?? null;
                  }
                }
              }
            }

            if (userId && !sub.metadata?.["userId"]) {
              sub.metadata = { ...(sub.metadata ?? {}), userId };
            }
            await applySubscription(sub);
          }
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          await applySubscription(event.data.object as Stripe.Subscription);
          break;
        }
        case "customer.subscription.deleted": {
          await clearSubscription(event.data.object as Stripe.Subscription);
          break;
        }
        default:
          req.log.debug({ type: event.type }, "Unhandled stripe event");
      }
      res.status(200).json({ received: true });
    } catch (err) {
      req.log.error({ err, type: event.type }, "Webhook handler failed");
      res.status(500).json({ error: "Webhook handler error" });
    }
  },
);

export default router;
