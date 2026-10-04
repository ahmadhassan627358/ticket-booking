"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bus, LogIn, Lock, Mail, Phone, AlertCircle, Eye, EyeOff, ShieldCheck, User } from "lucide-react";
import { LoginSchema } from "@/lib/validations";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const urlError = searchParams.get("error");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "AccessDenied"
      ? "Access Denied: You need Administrator privileges to view that page."
      : urlError === "CredentialsSignin"
      ? "Invalid email/phone or password."
      : null
  );
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // 1. Client-side Zod validation
    const validation = LoginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      const flattened = validation.error.flatten().fieldErrors;
      setFieldErrors({
        identifier: flattened.identifier?.[0],
        password: flattened.password?.[0],
      });
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: unknown) {
      setError("An unexpected error occurred during login. Please try again.");
      setLoading(false);
    }
  };

  const handleQuickFill = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
    setFieldErrors({});
  };

  return (
    <div className="w-full max-w-md">
      {/* Header Branding */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 shadow-xl shadow-blue-600/30 mb-3">
          <Bus className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Welcome to <span className="text-sky-400">Safar Express</span>
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Sign in with your Email or Pakistani Mobile Number
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-blue-950/40">
        
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email or Phone Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email or Mobile Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {identifier.includes("@") ? (
                  <Mail className="w-4 h-4 text-sky-400" />
                ) : (
                  <Phone className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@safar.pk or 0300-1234567"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                autoComplete="username"
                required
              />
            </div>
            {fieldErrors.identifier && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.identifier}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4 text-sky-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold text-center mb-2.5">
            Quick Test Logins
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("admin@safar.pk", "Admin@123")}
              className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 hover:bg-amber-900/40 text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </div>
              <div className="text-[10px] text-amber-200/70 truncate">admin@safar.pk</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill("ali.khan@gmail.com", "Customer@123")}
              className="p-2 rounded-lg bg-blue-950/30 border border-blue-800/40 hover:bg-blue-900/40 text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                <User className="w-3.5 h-3.5" />
                <span>Customer (Email)</span>
              </div>
              <div className="text-[10px] text-sky-200/70 truncate">ali.khan@gmail.com</div>
            </button>
          </div>

          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => handleQuickFill("0300-9876541", "Customer@123")}
              className="text-[11px] text-slate-400 hover:text-sky-300 transition-colors inline-flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              <span>Or test Phone login: 0300-9876541</span>
            </button>
          </div>
        </div>

        {/* Footer Registration Link */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
