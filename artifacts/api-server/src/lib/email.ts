import { logger } from "./logger";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "LLM Margin <onboarding@resend.dev>";
const SUBJECT = "Your LLM Margin sign-in code";

function buildBody(code: string) {
  const text =
    `Your LLM Margin sign-in code is: ${code}\n\n` +
    `This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#0f172a; margin: 0 0 16px;">Your sign-in code</h2>
      <p style="color:#475569; font-size: 14px; margin: 0 0 24px;">
        Enter this code in the LLM Margin sign-in page. It expires in 10 minutes.
      </p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 24px; background:#f1f5f9; color:#0f172a; border-radius: 8px; text-align:center;">
        ${code}
      </div>
      <p style="color:#94a3b8; font-size: 12px; margin: 24px 0 0;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `;
  return { text, html };
}

export async function sendOtpEmail(toEmail: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const { text, html } = buildBody(code);

  if (!apiKey) {
    logger.warn(
      { email: toEmail },
      `[OTP-DEV] RESEND_API_KEY not set — printing code to console. Code: ${code}`,
    );
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: SUBJECT,
    text,
    html,
  });

  if (error) {
    logger.error({ err: error, email: toEmail }, "Failed to send OTP email");
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
