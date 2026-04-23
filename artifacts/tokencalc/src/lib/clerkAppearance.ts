const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const logoImageUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}${basePath}/logo.svg`
    : `${basePath}/logo.svg`;

export const clerkAppearance = {
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl,
  },
  variables: {
    colorPrimary: "hsl(221 83% 53%)",
    colorForeground: "hsl(240 10% 3.9%)",
    colorMutedForeground: "hsl(240 3.8% 46.1%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(240 10% 3.9%)",
    colorNeutral: "hsl(240 5.9% 90%)",
    fontFamily: '"Inter", system-ui, sans-serif',
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox:
      "bg-white border border-border rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground text-xl font-semibold",
    headerSubtitle: "text-muted-foreground text-sm",
    socialButtonsBlockButton:
      "border border-border bg-white hover:bg-muted",
    socialButtonsBlockButtonText: "text-foreground text-sm font-medium",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground text-xs",
    formFieldLabel: "text-foreground text-sm font-medium",
    formFieldInput:
      "border border-border bg-white text-foreground placeholder:text-muted-foreground",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium",
    footerAction: "text-sm",
    footerActionText: "text-muted-foreground",
    footerActionLink: "text-primary font-medium hover:underline",
    identityPreviewEditButton: "text-primary hover:underline",
    formFieldSuccessText: "text-emerald-600 text-xs",
    alert: "bg-red-50 border border-red-200 rounded-md",
    alertText: "text-red-800 text-sm",
    otpCodeFieldInput: "border border-border bg-white text-foreground",
    formFieldRow: "gap-2",
    main: "gap-4",
    logoBox: "flex items-center justify-center mb-2",
    logoImage: "h-8 w-auto",
  },
};
