import SearchForm from "@/components/SearchForm";
import PopularRoutes from "@/components/PopularRoutes";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Clock,
  Bus,
  CheckCircle2,
  Ticket,
  Search,
  CreditCard,
  QrCode,
  ArrowRight,
  RotateCcw,
  Users,
  MapPin,
  HelpCircle,
  Percent,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col bg-slate-950 text-white">
      
      {/* Hero Section with Search Form */}
      <section className="relative pt-8 pb-12 sm:pt-12 sm:pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 border-b border-blue-900/30 overflow-hidden">
        
        {/* Glow & Backdrop Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-blue-600/15 via-sky-500/10 to-blue-600/15 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-700/60 text-sky-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Premium Intercity Express Bus Booking</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Travel Across Pakistan <br className="hidden sm:inline" />
              With <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400">Supreme Comfort</span>
            </h1>
            
            <p className="mt-4 text-base sm:text-lg text-slate-300">
              Book luxury Business (2x1) &amp; Executive (2x2) buses across Lahore, Islamabad, Karachi, Peshawar, Multan, Faisalabad &amp; more.
            </p>
          </div>

          {/* Interactive Search Box */}
          <div className="max-w-5xl mx-auto">
            <SearchForm />
          </div>

          {/* Trust Value Badges */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-center text-xs text-slate-300 font-medium">
            <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant Seat Confirmation</span>
            </div>
            <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
              <Bus className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Luxury 2x1 &amp; 2x2 Buses</span>
            </div>
            <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
              <Clock className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Punctual Departures</span>
            </div>
            <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Secure Booking &amp; Refunds</span>
            </div>
          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-900/70 border-b border-slate-800">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simple 4-Step Journey</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              How Safar Express Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Book your intercity bus tickets in less than 2 minutes with real-time seat locking and automated refund protection.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl space-y-4 group transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-950 border border-blue-800 text-sky-400 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                1
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-sky-400" />
                  <span>Search Route &amp; Date</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Choose origin, destination, and travel date. Filter by <strong>Business (2x1)</strong> or <strong>Executive (2x2)</strong> coaches with transparent fares.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl space-y-4 group transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                2
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bus className="w-4 h-4 text-emerald-400" />
                  <span>Pick Seats (Gender-Safe)</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select your seats on the interactive coach map. Temporary 10-minute seat lock holds your reservation with gender-safety enforcement.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl space-y-4 group transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-800 text-purple-300 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                3
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span>Pay Online or Cash</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pay instantly via online debit/credit cards, or choose <strong>Cash at Terminal</strong> to pay at the departure counter prior to travel.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl space-y-4 group transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                4
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>QR Ticket &amp; Travel</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Get your unique 8-character PNR and downloadable <strong>E-Ticket PDF with QR Code</strong>. Track, board, or cancel with refund anytime.
                </p>
              </div>
            </div>

          </div>

          {/* Refund Policy Highlight Banner */}
          <div className="bg-gradient-to-r from-blue-950/80 via-slate-950 to-slate-950 border border-blue-800/40 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>100% Refund Protection</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Change of plans? We have you covered.
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cancel more than 24 hours before departure for a <strong>100% Full Refund</strong>. 75% refund up to 6 hours before departure.
              </p>
            </div>

            <Link
              href="/terms"
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 shrink-0 self-start md:self-auto"
            >
              <span>View Refund Policy</span>
              <ArrowRight className="w-4 h-4 text-sky-400" />
            </Link>
          </div>

        </div>
      </section>

      {/* Popular Routes Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-slate-950">
        <PopularRoutes />
      </section>

    </main>
  );
}
