"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bus, UserPlus, Lock, Mail, Phone, User, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { RegisterSchema } from "@/lib/validations";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePhoneChange = (val: string) => {
    // Keep raw typing clean
    setPhone(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // 1. Client-side Zod validation
    const validation = RegisterSchema.safeParse({
      name,
      phone,
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const flattened = validation.error.flatten().fieldErrors;
      const errors: Record<string, string> = {};
      for (const [key, messages] of Object.entries(flattened)) {
        if (messages && messages[0]) {
          errors[key] = messages[0];
        }
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      // 2. Call registration API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          const errors: Record<string, string> = {};
          for (const [key, messages] of Object.entries(data.details as Record<string, string[]>)) {
            if (messages && messages[0]) errors[key] = messages[0];
          }
          setFieldErrors(errors);
        }
        setError(data.error || "Failed to create account. Please check your inputs.");
        setLoading(false);
        return;
      }

      // 3. Registration success -> automatic login
      setSuccess(true);
      setTimeout(async () => {
        const loginRes = await signIn("credentials", {
          identifier: email,
          password,
          redirect: false,
          callbackUrl: "/",
        });

        if (loginRes?.ok) {
          router.push("/");
          router.refresh();
        } else {
          router.push("/login");
        }
      }, 1000);
    } catch (err: unknown) {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950">
      <div className="w-full max-w-md">
        
        {/* Header Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 shadow-xl shadow-blue-600/30 mb-3">
            <Bus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Create an <span className="text-sky-400">Account</span>
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Book buses easily across Pakistan with Safar Express
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

          {success && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>Account created successfully! Logging you in...</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-sky-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bilal Ahmed"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>
              )}
            </div>

            {/* Pakistani Mobile Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Pakistani Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4 text-sky-400" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="0300-1234567 or 03001234567"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Format: 03XX-XXXXXXX or +923XXXXXXXXX</p>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4 text-sky-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bilal@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-sky-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-sky-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link to Login */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-sky-400 hover:text-sky-300 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
