import "./home.css";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const isHome = window.location.pathname.replace(/\/$/, "") === base;

if (!isHome) {
  // The Worker serves index.html for private and unknown SPA paths too.
  // Those paths still need the real router, auth checks and full app styles.
  void import("./main");
} else {
  // Native links and the native <details> menu don't need the React runtime.
  const accountLink = document.querySelector<HTMLAnchorElement>(
    '[data-testid="button-sign-in"]',
  );
  if (accountLink) {
    void fetch(`${base}/api/auth/me`, { credentials: "same-origin" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user?.id) {
          accountLink.href = `${base}/account`;
          accountLink.textContent = "Account";
        }
      })
      .catch(() => {
        /* Keep sign-in available if the session check fails. */
      });
  }
}
