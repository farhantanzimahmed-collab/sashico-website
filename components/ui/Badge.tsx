import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "sale" | "new" | "sold-out" | "success" | "warning" | "error";
  className?: string;
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default:    "bg-brand-gray-100 text-brand-gray-700",
    sale:       "bg-black text-white",
    new:        "bg-black text-white",
    "sold-out": "bg-brand-gray-200 text-brand-gray-500",
    success:    "bg-green-100 text-green-800",
    warning:    "bg-yellow-100 text-yellow-800",
    error:      "bg-red-100 text-red-800",
  };

  return (
    <span
      className={cn(
        "inline-block px-2.5 py-0.5 text-2xs font-medium uppercase tracking-widest rounded",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
