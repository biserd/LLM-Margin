import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

const routeMetadataSelectors = [
  "title",
  'link[rel="canonical"]',
  'meta[name="description"]',
  'meta[name="robots"]',
  'meta[name="keywords"]',
  'meta[property^="og:"]',
  'meta[property^="article:"]',
  'meta[name^="twitter:"]',
];
const defaultShareImage = "https://llmmargin.com/opengraph.jpg";

export function clearInitialRouteMetadata() {
  document.head
    .querySelectorAll(routeMetadataSelectors.join(", "))
    .forEach((tag) => tag.remove());
}

export function RouteMetadataDefaults() {
  const [pathname] = useLocation();

  useLayoutEffect(() => {
    const head = document.head;
    const canonical = head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    if (!canonical) return;

    const added: HTMLMetaElement[] = [];
    function defaultMeta(attribute: "name" | "property", key: string, value: string) {
      const existing = head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (existing) return existing.content;
      if (!value) return "";

      const tag = document.createElement("meta");
      tag.setAttribute(attribute, key);
      tag.content = value;
      head.append(tag);
      added.push(tag);
      return value;
    }

    const description = head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? "";
    defaultMeta("name", "robots", "index, follow");
    defaultMeta("property", "og:type", "website");
    defaultMeta("property", "og:site_name", "LLM Margin");
    defaultMeta("property", "og:url", canonical);
    const title = defaultMeta("property", "og:title", document.title);
    const summary = defaultMeta("property", "og:description", description);
    const image = defaultMeta("property", "og:image", defaultShareImage);
    if (image === defaultShareImage) {
      defaultMeta("property", "og:image:width", "1200");
      defaultMeta("property", "og:image:height", "630");
    }
    defaultMeta("name", "twitter:card", "summary_large_image");
    defaultMeta("name", "twitter:title", title);
    defaultMeta("name", "twitter:description", summary);
    defaultMeta("name", "twitter:image", image);

    return () => added.forEach((tag) => tag.remove());
  }, [pathname]);

  return null;
}
