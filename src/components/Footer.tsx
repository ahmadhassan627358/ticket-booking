import Link from "next/link";
import {
  Bus,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  Sparkles,
  Ticket,
  FileText,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-850 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand & About */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-emerald-400 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-black text-base tracking-tight text-white">
                  SAFAR <span className="text-sky-400">EXPRESS</span>
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-semibold uppercase tracking-wider">
                  Transit Network
                </span>
              </div>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed">
              Pakistan's premier intercity bus reservation platform. Seamless booking, real-time seat locking, automated refunds, and luxury travel across major corridors.
            </p>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-xs">Govt. Verified &amp; Secured Booking</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h3 className="font-bold text-white uppercase text-xs tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-sky-400 transition-colors flex items-center gap-1.5">
                  <span>Home &amp; Trip Search</span>
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-sky-400 transition-colors flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-sky-400" />
                  <span>Track &amp; Download Ticket</span>
                </Link>
              </li>
              <li>
                <Link href="/my-bookings" className="hover:text-sky-400 transition-colors flex items-center gap-1.5">
                  <span>My Reservations</span>
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-sky-400 transition-colors flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Terms &amp; Refund Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-sky-400 transition-colors flex items-center gap-1.5 text-slate-500 hover:text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Portal</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Corridors */}
          <div className="space-y-3">
            <h3 className="font-bold text-white uppercase text-xs tracking-wider">
              Popular Routes
            </h3>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                <span>Lahore ↔ Islamabad / Rawalpindi</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Lahore ↔ Multan ↔ Karachi</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                <span>Islamabad ↔ Peshawar</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Lahore ↔ Faisalabad</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                <span>Lahore ↔ Sargodha ↔ Islamabad</span>
              </li>
            </ul>
          </div>

          {/* 24/7 Helpline & Support */}
          <div className="space-y-3">
            <h3 className="font-bold text-white uppercase text-xs tracking-wider">
              24/7 Customer Support
            </h3>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-white">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-bold font-mono">042-111-SAFAR (72327)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>support@safar.pk</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Terminals open 24/7 nationwide</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Guarantee */}
        <div className="mt-12 pt-6 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} Safar Express Technologies Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-200 transition-colors">
              Refund Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">
              Terms of Carriage
            </Link>
            <span>•</span>
            <Link href="/track" className="hover:text-slate-200 transition-colors">
              Ticket Check
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
