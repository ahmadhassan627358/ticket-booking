"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MapPin,
  Navigation,
  Bus,
  Calendar,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ExternalLink,
  Menu,
  X,
  Ticket,
  BarChart3,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/?error=AdminAccessRequired");
    }
  }, [status, session, router]);

  if (status === "loading" || !session || session.user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Bookings Management", href: "/admin/bookings", icon: Ticket },
    { label: "Reports & Analytics", href: "/admin/reports", icon: BarChart3 },
    { label: "Trips & Bulk Generator", href: "/admin/trips", icon: Calendar },
    { label: "Routes & Stops", href: "/admin/routes", icon: Navigation },
    { label: "Bus Fleet Inventory", href: "/admin/buses", icon: Bus },
    { label: "Cities Management", href: "/admin/cities", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">

      {/* Desktop Sidebar (64 to 72 width) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-slate-900 border-r border-slate-800 shrink-0 sticky top-0 h-screen">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-sm tracking-tight text-white flex items-center gap-1">
                SAFAR <span className="text-amber-400">ADMIN</span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Management Portal
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 mb-2">
            Operations &amp; Master Data
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-sky-400 group-hover:text-white"}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer Admin User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                {session.user.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white truncate max-w-[120px]">
                  {session.user.name}
                </div>
                <div className="text-[10px] text-amber-400 font-bold uppercase">ADMINISTRATOR</div>
              </div>
            </div>

            <Link
              href="/"
              title="Return to Public Site"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-300 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
          <span className="font-bold text-sm text-white">Safar Control Center</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-300"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2 animate-in fade-in">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
                  isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 text-sky-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-slate-950 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
