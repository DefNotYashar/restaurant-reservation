import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "pending" | "confirmed" | "arrived" | "seated" | "completed" | "cancelled" | "noshow";

const styles: Record<BadgeVariant, string> = {
  default: "bg-zinc-800 text-zinc-200",
  pending: "bg-yellow-400/15 text-yellow-300",
  confirmed: "bg-emerald-500/15 text-emerald-400",
  arrived: "bg-sky-500/15 text-sky-400",
  seated: "bg-sky-500/15 text-sky-400",
  completed: "bg-zinc-700/40 text-zinc-400",
  cancelled: "bg-zinc-700/40 text-zinc-500",
  noshow: "bg-zinc-700/40 text-zinc-500",
};

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "PENDING":
      return "pending";
    case "CONFIRMED":
      return "confirmed";
    case "ARRIVED":
      return "arrived";
    case "SEATED":
      return "seated";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "NO_SHOW":
      return "noshow";
    default:
      return "default";
  }
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "در انتظار",
    CONFIRMED: "تأیید شده",
    ARRIVED: "حاضر شده",
    SEATED: "نشسته",
    COMPLETED: "تکمیل شده",
    CANCELLED: "لغو شده",
    NO_SHOW: "حاضر نشد",
  };
  return labels[status] ?? status;
}

export function Badge({ variant = "default", className, children }: { variant?: BadgeVariant; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", styles[variant], className)}>
      {children}
    </span>
  );
}