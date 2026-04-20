import { getMarginLabel } from "@/lib/calculator";

interface MarginHealthBadgeProps {
  pct: number;
  className?: string;
}

const colors: Record<string, string> = {
  Healthy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Watch: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "At Risk": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  Danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Unprofitable: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function MarginHealthBadge({ pct, className = "" }: MarginHealthBadgeProps) {
  const label = getMarginLabel(pct);
  const colorClass = colors[label] ?? colors.Danger;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass} ${className}`}
      data-testid="margin-health-badge"
    >
      {label}
    </span>
  );
}
