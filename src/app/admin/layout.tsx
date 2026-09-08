"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, UtensilsCrossed, CalendarDays, LayoutGrid, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { label: "امروز", href: "/admin", icon: Clock },
  { label: "رزروها", href: "/admin/reservations", icon: CalendarDays },
  { label: "میزها", href: "/admin/floor", icon: LayoutGrid },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden md:flex w-56 flex-col border-l border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-zinc-800">
          <UtensilsCrossed className="w-6 h-6 text-amber-400" />
          <span className="font-bold text-lg tracking-tight">رستوران</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === l.href ? "bg-amber-500/10 text-amber-400 font-medium" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
            >
              <l.icon className="w-4 h-4" />
              <span>{l.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="md:hidden fixed top-3 right-3 z-50">
        <button onClick={() => setOpen(!open)} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 bg-zinc-950/80 md:hidden" onClick={() => setOpen(false)} />
      )}
      {open && (
        <aside className="fixed top-0 right-0 z-40 w-56 h-full bg-zinc-900 border-r border-zinc-800 p-4 md:hidden shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <UtensilsCrossed className="w-6 h-6 text-amber-400" />
            <span className="font-bold text-lg">رستوران</span>
          </div>
          <nav className="space-y-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${pathname === l.href ? "bg-amber-500/10 text-amber-400 font-medium" : "text-zinc-300"}`}>
                <l.icon className="w-4 h-4" />
                <span>{l.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-auto max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}