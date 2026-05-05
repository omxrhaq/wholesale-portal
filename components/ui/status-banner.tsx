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
    className: "border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/35 dark:text-sky-100",
    iconClassName: "text-sky-700 dark:text-sky-300",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-100",
    iconClassName: "text-amber-700 dark:text-amber-300",
  },
  error: {
    icon: CircleAlert,
    className: "border-destructive/20 bg-destructive/10 text-destructive dark:border-destructive/35 dark:bg-destructive/15 dark:text-red-100",
    iconClassName: "text-destructive dark:text-red-300",
  },
  info: {
    icon: Info,
    className: "border-blue-200/90 bg-blue-50 text-blue-900 dark:border-blue-800/80 dark:bg-blue-950/30 dark:text-blue-100",
    iconClassName: "text-blue-700 dark:text-blue-300",
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
