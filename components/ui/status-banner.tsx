import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type StatusBannerVariant = "success" | "warning" | "error" | "info";

const variantStyles: Record<
  StatusBannerVariant,
  {
    icon: LucideIcon;
    className: string;
    iconClassName: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-300 bg-emerald-50 text-emerald-900",
    iconClassName: "text-emerald-700",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-300 bg-amber-50 text-amber-900",
    iconClassName: "text-amber-700",
  },
  error: {
    icon: CircleAlert,
    className: "border-destructive/20 bg-destructive/10 text-destructive",
    iconClassName: "text-destructive",
  },
  info: {
    icon: Info,
    className: "border-sky-300 bg-sky-50 text-sky-900",
    iconClassName: "text-sky-700",
  },
};

type StatusBannerProps = {
  variant?: StatusBannerVariant;
  title: string;
  description?: string;
  className?: string;
};

export function StatusBanner({
  variant = "info",
  title,
  description,
  className,
}: StatusBannerProps) {
  const { icon: Icon, className: variantClassName, iconClassName } =
    variantStyles[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm",
        variantClassName,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconClassName)} />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="leading-6 opacity-90">{description}</p> : null}
      </div>
    </div>
  );
}
