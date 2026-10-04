"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-white bg-slate-950">
      <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-5 shadow-2xl animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-700 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-white">Something Went Wrong</h2>
          <p className="text-xs text-slate-400">
            {error.message || "An unexpected error occurred while loading this page. Please try refreshing."}
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
