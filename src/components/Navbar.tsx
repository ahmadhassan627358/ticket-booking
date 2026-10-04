"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { 
  Bus, 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Ticket, 
  ShieldCheck, 
  Menu, 
  X,
  ChevronDown
} from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isLoading = status === "loading";
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-blue-900/40 text-white shadow-lg shadow-blue-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform duration-200">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                SAFAR <span className="text-sky-400 font-bold">EXPRESS</span>
              </div>
              <div className="text-[10px] text-blue-300/80 -mt-1 font-medium tracking-wider uppercase">
                Pakistan Intercity Transit
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              href="/"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Home
            </Link>

            <Link
              href="/track"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors"
            >
              <Ticket className="w-4 h-4 text-sky-400" />
              <span>Track Ticket</span>
            </Link>

            <Link
              href="/my-bookings"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors"
            >
              <span>My Bookings</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="px-3.5 py-2 rounded-lg text-sm font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/40 flex items-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Admin Panel</span>
              </Link>
            )}
          </nav>

          {/* Desktop Auth Controls */}
          <div className="hidden md:flex items-center space-x-3">
            {isLoading ? (
              <div className="w-24 h-9 bg-slate-800 animate-pulse rounded-lg" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  onBlur={() => setTimeout(() => setUserDropdownOpen(false), 200)}
                  className="flex items-center space-x-2.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-sky-400 uppercase font-bold tracking-wider">
                      {user.role}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2.5">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{user.phone}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/my-bookings"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white"
                      >
                        <Ticket className="w-4 h-4 text-sky-400" />
                        My Bookings
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-slate-800"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          Admin Dashboard
                        </Link>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4 text-sky-400" />
                  <span>Login</span>
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-5 space-y-3">
          {user ? (
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{user.name}</div>
                  <div className="text-xs text-sky-400">{user.email}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 border border-blue-700 text-sky-300">
                {user.role}
              </span>
            </div>
          ) : null}

          <div className="flex flex-col space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2"
            >
              <Bus className="w-4 h-4 text-sky-400" />
              <span>Home</span>
            </Link>

            <Link
              href="/my-bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2"
            >
              <Ticket className="w-4 h-4 text-sky-400" />
              <span>My Bookings</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/50 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Admin Panel</span>
              </Link>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="w-full px-4 py-2.5 text-sm font-medium text-red-400 bg-red-950/30 border border-red-900/40 rounded-xl flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({user.name})</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-center text-sm font-medium text-slate-200 bg-slate-800 rounded-xl"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-center text-sm font-semibold text-white bg-blue-600 rounded-xl"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
