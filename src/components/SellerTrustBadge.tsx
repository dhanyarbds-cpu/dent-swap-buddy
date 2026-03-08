import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface SellerTrustBadgeProps {
  trustScore: number;
  compact?: boolean;
}

const SellerTrustBadge = ({ trustScore, compact = false }: SellerTrustBadgeProps) => {
  let label: string;
  let color: string;
  let Icon = ShieldCheck;

  if (trustScore >= 90) {
    label = "Highly Trusted";
    color = "text-verified bg-verified/10";
  } else if (trustScore >= 70) {
    label = "Trusted";
    color = "text-primary bg-primary/10";
  } else if (trustScore >= 50) {
    label = "Warning";
    color = "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400";
    Icon = ShieldAlert;
  } else {
    label = "High Risk";
    color = "text-destructive bg-destructive/10";
    Icon = ShieldX;
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
        <Icon className="h-3 w-3" />
        {Math.round(trustScore)}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span className="opacity-70">({Math.round(trustScore)})</span>
    </div>
  );
};

export default SellerTrustBadge;
