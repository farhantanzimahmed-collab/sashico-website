import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-brand-gray-400",
}: StatsCardProps) {
  return (
    <div className="bg-white border border-brand-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xs uppercase tracking-widest text-brand-gray-500 font-sans font-medium">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold font-sans text-brand-black">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                "mt-1 text-xs font-sans",
                changeType === "positive" && "text-green-600",
                changeType === "negative" && "text-red-600",
                changeType === "neutral" && "text-brand-gray-500"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn("p-3 bg-brand-gray-50", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
