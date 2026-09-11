"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  UtensilsCrossed,
  CalendarDays,
  LayoutGrid,
  Users,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatToday } from "@/lib/persian";

const links = [
  { label: "امروز", href: "/admin", icon: Clock },
  { label: "رزروها", href: "/admin/reservations", icon: CalendarDays },
  { label: "نقشه میزها", href: "/admin/table-plan", icon: LayoutGrid },
  { label: "مشتریان", href: "/admin/customers", icon: Users },
  { label: "تنظیمات", href: "/admin/settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState("رستوران");

  useEffect(() => {
    fetch("/api/restaurants", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d[0]?.name) setRestaurantName(d[0].name);
      })
      .catch(() => {});
  }, []);

  const nav = (onClick?: () => void) => (
    <>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            isActive(pathname, l.href)
              ? "bg-amber-500/10 text-amber-400 font-medium"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
          }`}
        >
          <l.icon className="w-4 h-4" />
          <span>{l.label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-zinc-800">
          <UtensilsCrossed className="w-6 h-6 text-amber-400" />
          <span className="font-bold text-lg tracking-tight truncate">{restaurantName}</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">{nav()}</nav>
      </aside>

      <div className="md:hidden fixed top-3 right-3 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200"
          aria-label="منو"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-zinc-950/80 md:hidden" onClick={() => setOpen(false)} />}
      {open && (
        <aside className="fixed top-0 right-0 z-40 w-56 h-full bg-zinc-900 border-l border-zinc-800 p-4 md:hidden shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <UtensilsCrossed className="w-6 h-6 text-amber-400" />
            <span className="font-bold text-lg truncate">{restaurantName}</span>
          </div>
          <nav className="space-y-1">{nav(() => setOpen(false))}</nav>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UtensilsCrossed className="w-5 h-5 text-amber-400 md:hidden" />
            <span className="font-semibold truncate">{restaurantName}</span>
            <span className="hidden sm:inline text-xs text-zinc-500">{formatToday()}</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
            مدیر
          </span>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto w-full max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
