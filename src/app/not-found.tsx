import Link from "next/link";
import { Search, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-white bg-slate-950">
      <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 text-sky-400 flex items-center justify-center mx-auto text-2xl font-black">
          404
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-white">Page Not Found</h2>
          <p className="text-xs text-slate-400">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Home</span>
          </Link>
          <Link
            href="/track"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Ticket</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
