import { Link } from "wouter";
import { SeoFooter } from "@/components/SeoFooter";

interface Post {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  readMins: number;
  date: string;
  category: string;
}

const posts: Post[] = [
  {
    slug: "/blog/how-to-calculate-llm-cost-per-user",
    title: "How to Calculate LLM Cost Per User (Formula, Examples, Benchmarks)",
    description:
      "The exact formula for LLM cost per user, worked examples for GPT-4o, Claude Sonnet, and Gemini, and the four numbers most founders get wrong when modeling AI unit economics.",
    keywords:
      "LLM cost per user, AI cost per user, calculate ChatGPT API cost, OpenAI cost per user, Claude cost per user",
    readMins: 9,
    date: "2026-05-09",
    category: "Unit Economics",
  },
  {
    slug: "/blog/ai-api-budget-planning-for-startups",
    title: "AI API Budget Planning for Startups: A Practical 12-Month Framework",
    description:
      "How early-stage startups should size, allocate, and stress-test their OpenAI, Anthropic, and Gemini budgets — including the three scenarios every founder should model before raising.",
    keywords:
      "AI API budget, OpenAI budget for startups, AI cost forecast, LLM budget planning, startup AI spend",
    readMins: 11,
    date: "2026-05-09",
    category: "Budgeting",
  },
];

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      <title>Blog: LLM Cost & AI Unit Economics for SaaS Founders | LLM Margin</title>
      <meta
        name="description"
        content="Practical, numbers-first guides on LLM cost per user, AI API budgeting for startups, and the unit economics of GPT-4o, Claude, and Gemini-powered products."
      />
      <meta
        name="keywords"
        content="LLM cost guides, AI unit economics blog, OpenAI cost articles, AI startup budget"
      />
      <link rel="canonical" href="https://tokencalc.com/blog" />
      <meta property="og:title" content="The LLM Margin Blog — AI cost math for founders" />
      <meta
        property="og:description"
        content="Numbers-first guides on LLM cost per user, AI budget planning for startups, and pricing AI features that actually pay for themselves."
      />

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
            LLM Margin Blog
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            AI cost math for founders, not consultants
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Practical guides on LLM unit economics, with formulas, charts, and
            the calculators you need to plug your own numbers in. Built for
            founders staring at OpenAI invoices.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-6 max-w-3xl mx-auto">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={post.slug}
              className="block bg-card border rounded-xl p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
              data-testid={`card-post-${post.slug.split("/").pop()}`}
            >
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {post.category}
                </span>
                <span>{post.readMins} min read</span>
                <span>·</span>
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-2 leading-tight">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {post.description}
              </p>
              <p className="text-sm text-primary font-medium mt-4">
                Read the guide →
              </p>
            </Link>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-12">
          <SeoFooter
            paragraph="Each guide on the LLM Margin blog ends with the same thing: the calculator you need to put your own numbers into. We don't write generic AI think pieces — we write the spreadsheet you wish your CFO had given you."
            links={[
              { href: "/", anchor: "SaaS Margin Simulator" },
              { href: "/cost-per-user", anchor: "Cost Per User Calculator" },
              { href: "/budget-planner", anchor: "AI Budget Planner" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
