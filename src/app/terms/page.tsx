import Link from "next/link";
import {
  ShieldCheck,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Bus,
  Users,
  CreditCard,
  Phone,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Terms of Carriage & Refund Policy | Safar Express",
  description: "Official cancellation tiers, refund percentages, luggage policies, and terms of carriage for Safar Express Pakistan.",
};

export default function TermsAndRefundPolicyPage() {
  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border border-blue-800/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-950/80 text-sky-400 border border-blue-800">
            <FileText className="w-3.5 h-3.5" />
            <span>Customer Protection &amp; Guidelines</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Terms of Service &amp; <span className="text-sky-400">Refund Policy</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Transparent cancellation tiers, refund processing rules, luggage allowance, and passenger guidelines for smooth intercity transit across Pakistan.
          </p>
        </div>

        {/* 1. Cancellation & Refund Policy Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Ticket Cancellation &amp; Refund Tiers
              </h2>
              <p className="text-xs text-slate-400">
                Automated refunds are calculated based on the time remaining before scheduled departure.
              </p>
            </div>
          </div>

          {/* Refund Tiers Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider bg-slate-900/60">
                  <th className="py-3.5 px-4">Cancellation Window</th>
                  <th className="py-3.5 px-4">Refund %</th>
                  <th className="py-3.5 px-4">Deduction</th>
                  <th className="py-3.5 px-4">Seat Release</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-slate-900/30">
                  <td className="py-4 px-4">
                    <div className="font-bold text-white text-sm">
                      More than 24 Hours
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Prior to scheduled departure time
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-black text-xs">
                      100% Full Refund
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-slate-300">
                    Rs. 0 (Zero Fee)
                  </td>
                  <td className="py-4 px-4 text-emerald-400 font-medium">
                    Immediate
                  </td>
                </tr>

                <tr className="hover:bg-slate-900/30">
                  <td className="py-4 px-4">
                    <div className="font-bold text-white text-sm">
                      6 to 24 Hours
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Prior to scheduled departure time
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-blue-950 text-sky-300 border border-blue-800 font-black text-xs">
                      75% Refund
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-slate-300">
                    25% Cancellation Charge
                  </td>
                  <td className="py-4 px-4 text-emerald-400 font-medium">
                    Immediate
                  </td>
                </tr>

                <tr className="hover:bg-slate-900/30">
                  <td className="py-4 px-4">
                    <div className="font-bold text-white text-sm">
                      Less than 6 Hours
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Prior to scheduled departure time
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-black text-xs">
                      50% Refund
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-slate-300">
                    50% Cancellation Charge
                  </td>
                  <td className="py-4 px-4 text-emerald-400 font-medium">
                    Immediate
                  </td>
                </tr>

                <tr className="hover:bg-slate-900/30">
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-300 text-sm">
                      After Departure (Missed / Past Bus)
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Trip has already departed from terminal
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-red-950 text-red-300 border border-red-800 font-black text-xs">
                      0% (No Refund)
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-slate-400">
                    100% Forfeited
                  </td>
                  <td className="py-4 px-4 text-slate-500 font-medium">
                    N/A
                  </td>
                </tr>

                <tr className="hover:bg-slate-900/30 bg-emerald-950/20">
                  <td className="py-4 px-4">
                    <div className="font-bold text-emerald-300 text-sm">
                      Trip Cancelled by Safar Express
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Technical, weather, or operational cancellation
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-black text-xs">
                      100% Full Automated Refund
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                    Rs. 0 (Guaranteed)
                  </td>
                  <td className="py-4 px-4 text-emerald-400 font-medium">
                    Immediate
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Key Terms & Policies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Gender Safety & Seat Rules */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 text-pink-400">
              <Users className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">Gender Protection Policy</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              In accordance with transit safety norms in Pakistan, single male passengers cannot reserve seats directly adjacent to unrelated female passengers in paired seating rows. Our smart booking engine validates seat pairing at the time of reservation hold.
            </p>
          </div>

          {/* Cash Reservation Expiry */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 text-amber-400">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">Cash at Terminal Policy</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bookings selected with <strong>Cash at Terminal</strong> payment are created in <span className="text-amber-300 font-bold">PENDING</span> status. Passengers must present their PNR and pay cash at the origin terminal counter at least <strong>2 hours prior to departure</strong>, after which unpaid reservations automatically expire.
            </p>
          </div>

          {/* Luggage & Baggage Allowance */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 text-sky-400">
              <Bus className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">Baggage &amp; Luggage</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each passenger is entitled to <strong>up to 30 kg</strong> of complimentary cargo baggage in the lower hold and one standard handbag in the overhead bin. Excess baggage will be charged at standard terminal tariff rates.
            </p>
          </div>

          {/* Identification (CNIC) Requirements */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">Passenger Identification</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              All passengers aged 18 and above must present their <strong>Original National Identity Card (CNIC)</strong> or Passport at the boarding gate. For minors, a B-Form copy or parent accompaniment is required for security verification.
            </p>
          </div>

        </div>

        {/* 3. Fast Action Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Need to cancel a ticket or check your status?</h3>
            <p className="text-xs text-slate-400">Enter your 8-character PNR code and contact phone on our tracking page.</p>
          </div>
          <Link
            href="/track"
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <span>Track &amp; Manage Ticket</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
