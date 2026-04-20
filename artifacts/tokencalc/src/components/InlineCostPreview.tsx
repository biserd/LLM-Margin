import { formatUSD } from "@/lib/calculator";

interface InlineCostPreviewProps {
  callCost: number;
  cpau: number;
  monthlyCost: number;
  mau: number;
}

export function InlineCostPreview({ callCost, cpau, monthlyCost, mau }: InlineCostPreviewProps) {
  return (
    <p className="text-xs text-muted-foreground mt-1" data-testid="inline-cost-preview">
      ≈ {formatUSD(callCost, 6)} per call · {formatUSD(cpau, 2)} per user/month · {formatUSD(monthlyCost, 0)}/mo at {mau.toLocaleString()} users
    </p>
  );
}
