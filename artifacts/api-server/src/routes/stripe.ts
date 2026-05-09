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

router.post("/stripe/checkout", requireAuth, async (req, res) => {
  try {
    const lookupKey = req.body?.lookupKey;
    if (!isAllowedLookupKey(lookupKey)) {
      res.status(400).json({ error: "Invalid plan." });
      return;
    }

    const user = await loadUser(req.session!.userId);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Guard: if user already has an active/trialing subscription in Stripe,
    // don't create a duplicate. Send them to the billing portal instead.
    if (user.stripeCustomerId) {
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

    const customerId = await ensureStripeCustomer(
      user.id,
      user.email,
      user.stripeCustomerId,
    );

    const base = appBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      client_reference_id: user.id,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${base}/account?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?canceled=1`,
      subscription_data: {
        metadata: { userId: user.id },
      },
      metadata: { userId: user.id, lookupKey },
    });

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
      "Webhook: no user found for stripe customer",
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
            const userId =
              session.client_reference_id ||
              session.metadata?.["userId"] ||
              null;
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
