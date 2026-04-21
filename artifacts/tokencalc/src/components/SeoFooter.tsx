import { Link } from "wouter";

interface InternalLink {
  href: string;
  anchor: string;
}

interface SeoFooterProps {
  paragraph: string;
  links?: InternalLink[];
}

export function SeoFooter({ paragraph, links }: SeoFooterProps) {
  return (
    <section className="mt-12 border-t pt-8 max-w-3xl mx-auto" data-testid="seo-footer">
      <p className="text-sm text-muted-foreground leading-relaxed">{paragraph}</p>
      {links && links.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          Related tools:{" "}
          {links.map((l, i) => (
            <span key={l.href}>
              <Link href={l.href} className="text-primary hover:underline">{l.anchor}</Link>
              {i < links.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
