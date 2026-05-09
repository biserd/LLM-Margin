import { useState } from "react";
import { Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <title>Contact Us — LLM Margin</title>
      <meta name="description" content="Get in touch with the LLM Margin team. Support, feedback, billing, and partnership inquiries." />

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Get in touch</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Questions, bug reports, billing issues, or feature requests — we read every message.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Left: contact info */}
          <div className="space-y-6 md:col-span-1">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">
                  <a href="mailto:hello@llmmargin.com" className="text-primary hover:underline">hello@llmmargin.com</a>
                </p>
                <p className="text-xs text-muted-foreground mt-1">We reply within 1 business day.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Support</h3>
                <p className="text-sm text-muted-foreground">
                  <a href="mailto:support@llmmargin.com" className="text-primary hover:underline">support@llmmargin.com</a>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Pro subscribers get priority response.</p>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4 text-sm">
              <p className="font-medium mb-1">Looking for something specific?</p>
              <ul className="text-muted-foreground space-y-1 mt-2">
                <li>· <a href="/pricing" className="hover:text-primary">Pricing & plans</a></li>
                <li>· <a href="/terms" className="hover:text-primary">Terms of Service</a></li>
                <li>· <a href="/privacy" className="hover:text-primary">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          {/* Right: form */}
          <div className="md:col-span-2">
            {sent ? (
              <div className="bg-card border rounded-xl p-8 text-center" data-testid="contact-success">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Message sent</h2>
                <p className="text-muted-foreground mb-6">
                  Thanks for reaching out, {name || "there"}. We'll get back to you at {email || "your inbox"} within 1 business day.
                </p>
                <Button variant="outline" onClick={() => { setSent(false); setName(""); setEmail(""); setMessage(""); }} data-testid="button-send-another">
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-4" data-testid="contact-form">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Your name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Topic</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="select-topic"
                  >
                    <option value="general">General question</option>
                    <option value="bug">Bug report</option>
                    <option value="billing">Billing & subscription</option>
                    <option value="feature">Feature request</option>
                    <option value="partnership">Partnership / press</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Message</label>
                  <textarea
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    data-testid="input-message"
                    placeholder="Tell us what's on your mind..."
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    By submitting, you agree to our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                  </p>
                  <Button type="submit" data-testid="button-submit-contact">
                    <Send className="w-4 h-4 mr-2" /> Send message
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
