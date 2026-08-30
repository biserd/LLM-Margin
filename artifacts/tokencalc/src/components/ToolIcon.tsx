import {
  Coins,
  DatabaseZap,
  Gauge,
  GitBranch,
  MessagesSquare,
  RefreshCw,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ToolIconName } from "@/lib/acquisitionTools";

const ICONS: Record<ToolIconName, LucideIcon> = {
  users: Users,
  coins: Coins,
  gauge: Gauge,
  "git-branch": GitBranch,
  messages: MessagesSquare,
  "database-zap": DatabaseZap,
  "trending-up": TrendingUp,
  "refresh-cw": RefreshCw,
};

interface ToolIconProps {
  name: ToolIconName;
  className?: string;
}

export function ToolIcon({ name, className }: ToolIconProps) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden="true" />;
}
