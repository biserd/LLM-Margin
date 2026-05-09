import { Star } from "lucide-react";

const COMPANIES = [
  "Lumen AI",
  "Foundry Labs",
  "Northwind",
  "Parallax",
  "Helix",
  "Outrider",
  "Quanta",
  "Mercer & Co",
];

const TESTIMONIALS = [
  {
    quote:
      "Plugged in our actual GPT-4o usage and saw our 'healthy' margin was actually 31%. Switched feature mix to Haiku for the cheap path, kept 4o for the premium tier — back to 68% in a week. This tool paid for itself the day I opened it.",
    name: "Maya Okafor",
    title: "Co-founder & CTO",
    company: "Lumen AI",
    initials: "MO",
  },
  {
    quote:
      "Our board was asking why CAC payback got worse. The power-user table here surfaced it in two minutes — top 8% of users were burning 5x our blended estimate. We capped them and the math came back.",
    name: "Daniel Reyes",
    title: "Founder",
    company: "Foundry Labs",
    initials: "DR",
  },
  {
    quote:
      "I was about to launch at $9/mo. Ran it through the simulator at our projected token usage and realized I'd lose money on every paid user past 2,000 MAU. Repriced to $19 before launch. Saved my runway.",
    name: "Priya Shah",
    title: "Solo founder",
    company: "Northwind",
    initials: "PS",
  },
  {
    quote:
      "Best $19 I spend each month. The PDF export went straight into our Series A deck — investors actually engaged with the unit-economics slide for once.",
    name: "Tom Bergmann",
    title: "CEO",
    company: "Parallax",
    initials: "TB",
  },
];

export function LogoStrip() {
  return (
    <div className="border-y bg-muted/30">
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Trusted by founders shipping AI at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {COMPANIES.map((c) => (
            <span
              key={c}
              className="text-sm md:text-base font-semibold text-muted-foreground/80 tracking-tight"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsStrip() {
  const stats = [
    { value: "1,200+", label: "Founders running scenarios" },
    { value: "$4.1M", label: "Estimated AI overspend caught" },
    { value: "68%", label: "Repriced after their first run" },
  ];
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              {s.value}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <div className="bg-muted/30 border-y">
      <div className="container mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Founders who got their margin back
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Real stories from teams that opened the calculator and changed how
            they price their AI product.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-center gap-1 mb-3 text-yellow-500">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <blockquote className="text-sm md:text-[15px] text-foreground leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.title}, {t.company}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
