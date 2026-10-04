"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Bus,
  MapPin,
  Calendar,
  CreditCard,
  Banknote,
  Printer,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Users,
  Phone,
  Mail,
  Home,
  FileText,
  Sparkles,
} from "lucide-react";
import { maskCNIC } from "@/lib/ticketPdf";

interface BookingSeat {
  id: string;
  seatNo: number;
  passengerName: string;
  cnic: string;
  gender: string;
  fare: number;
  fromStop: { id: string; stopOrder: number; city: { name: string } };
  toStop: { id: string; stopOrder: number; city: { name: string } };
}

interface PaymentRecord {
  id: string;
  method: string;
  amount: number;
  status: string;
  transactionRef: string | null;
  createdAt: string;
}

interface BookingDetails {
  id: string;
  pnr: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  contactPhone: string;
  createdAt: string;
  trip: {
    id: string;
    departureTime: string;
    status: string;
    bus: {
      number: string;
      type: string;
      layout: string;
      totalSeats: number;
    };
    route: {
      name: string;
      stops: Array<{
        id: string;
        stopOrder: number;
        fareFromOrigin: number;
        city: { name: string };
      }>;
    };
  };
  seats: BookingSeat[];
  payments: PaymentRecord[];
  user?: {
    name: string;
    email: string;
    phone: string;
  } | null;
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const pnr = (params.pnr as string)?.toUpperCase();

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pnr) return;

    fetch(`/api/bookings/${pnr}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.booking) {
          setBooking(data.booking);
        } else {
          setError(data.error || "Booking not found.");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching booking details:", err);
        setError("Network error while loading booking details.");
        setLoading(false);
      });
  }, [pnr]);

  const copyPNR = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.pnr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-white bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-300 font-medium">Retrieving your confirmed ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-white bg-slate-950">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-700 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black">Booking Not Found</h2>
          <p className="text-sm text-slate-400">
            {error || `We could not find any ticket with PNR reference "${pnr}". Please check your booking code.`}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all inline-flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const firstSeat = booking.seats[0];
  const fromCity = firstSeat?.fromStop?.city?.name || "Origin Terminal";
  const toCity = firstSeat?.toStop?.city?.name || "Destination Terminal";
  const latestPayment = booking.payments[0];
  const isConfirmed = booking.status === "CONFIRMED";
  const isCashPending = booking.paymentStatus === "UNPAID" || booking.status === "PENDING";

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Status Banner */}
        <div className={`p-6 sm:p-8 rounded-3xl border-2 shadow-2xl transition-all ${
          isConfirmed
            ? "bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-emerald-500/50"
            : "bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border-amber-500/50"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900/80 border border-slate-700">
                {isConfirmed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Ticket Confirmed &amp; Issued</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-amber-300">Pending Cash Payment</span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {isConfirmed ? "Booking Confirmed!" : "Reservation Created Successfully"}
              </h1>

              <p className="text-sm text-slate-300">
                {isConfirmed
                  ? "Your intercity bus reservation has been secured. Show this e-ticket at the terminal during boarding."
                  : "Your seat has been reserved. Please pay cash at the bus terminal counter at least 2 hours before departure."}
              </p>
            </div>

            {/* PNR Code Pill */}
            <div className="bg-slate-950/90 border-2 border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[180px] shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Booking Reference (PNR)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black font-mono tracking-widest text-sky-400">
                  {booking.pnr}
                </span>
                <button
                  type="button"
                  onClick={copyPNR}
                  title="Copy PNR"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Save this code for check-in</span>
            </div>
          </div>
        </div>

        {/* Cash Notice Box if Pending */}
        {isCashPending && (
          <div className="p-5 rounded-2xl bg-amber-950/60 border border-amber-600/80 text-amber-100 flex items-start gap-4 shadow-lg animate-in fade-in">
            <Clock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-amber-300 text-sm block">Important Counter Payment Notice:</span>
              <p>
                Your reservation is held in <strong>PENDING</strong> status. Please visit the <strong>{fromCity} Safar Express Counter</strong> and present PNR <strong>{booking.pnr}</strong> to pay <strong>Rs. {booking.totalAmount.toLocaleString()}</strong> in cash.
              </p>
              <p className="text-amber-200/80">
                ⚠️ If payment is not completed at least <strong>2 hours before trip departure</strong>, this reservation will automatically expire and seats will be released.
              </p>
            </div>
          </div>
        )}

        {/* Main Printable Ticket Card */}
        <div id="printable-ticket" className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden print:border-black print:bg-white print:text-black">

          {/* Ticket Header */}
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-6 sm:p-8 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-none print:text-black print:border-b-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-600/30">
                🚌
              </div>
              <div>
                <h2 className="text-xl font-black text-white print:text-black">Safar Express E-Ticket</h2>
                <p className="text-xs text-sky-300 print:text-gray-600">Pakistan Intercity Bus Transit System</p>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-xs text-slate-400 print:text-gray-600">Booking Date</div>
              <div className="text-xs font-semibold text-white print:text-black">
                {new Date(booking.createdAt).toLocaleDateString("en-PK", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {/* Journey Details Bar */}
          <div className="p-6 sm:p-8 space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/80 rounded-2xl p-5 border border-slate-800/80 print:bg-gray-100 print:border-gray-300 print:text-black">
              {/* Origin Terminal */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600">
                  Boarding Terminal
                </span>
                <div className="text-lg font-black text-white print:text-black flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{fromCity}</span>
                </div>
                <div className="text-xs text-slate-400 print:text-gray-700">
                  Departure: {new Date(booking.trip.departureTime).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </div>
              </div>

              {/* Journey Route & Bus Type */}
              <div className="space-y-1 text-center border-y md:border-y-0 md:border-x border-slate-800 py-3 md:py-0 px-2 print:border-gray-300">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600">
                  Bus &amp; Service
                </span>
                <div className="text-base font-bold text-sky-300 print:text-black">
                  {booking.trip.bus.type} ({booking.trip.bus.layout})
                </div>
                <div className="text-xs text-slate-400 print:text-gray-700">
                  Bus #{booking.trip.bus.number}
                </div>
              </div>

              {/* Destination Terminal */}
              <div className="space-y-1 text-left md:text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600">
                  Dropping Terminal
                </span>
                <div className="text-lg font-black text-white print:text-black flex items-center justify-start md:justify-end gap-2">
                  <MapPin className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>{toCity}</span>
                </div>
                <div className="text-xs text-slate-400 print:text-gray-700">
                  Date: {new Date(booking.trip.departureTime).toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* Passenger & Seats List Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 print:text-black">
                <Users className="w-4 h-4 text-sky-400" />
                <span>Passenger Roster ({booking.seats.length})</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider print:border-gray-400 print:text-black">
                      <th className="py-2.5 px-3">Seat #</th>
                      <th className="py-2.5 px-3">Passenger Name</th>
                      <th className="py-2.5 px-3">CNIC Number</th>
                      <th className="py-2.5 px-3">Gender</th>
                      <th className="py-2.5 px-3 text-right">Fare</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-gray-300">
                    {booking.seats.map((seat) => (
                      <tr key={seat.id} className="hover:bg-slate-950/40 print:hover:bg-transparent">
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                            {seat.seatNo}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white print:text-black">
                          {seat.passengerName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300 print:text-black">
                          {maskCNIC(seat.cnic)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            seat.gender === "FEMALE"
                              ? "bg-pink-950 text-pink-300 border border-pink-800 print:bg-pink-100 print:text-pink-800"
                              : "bg-blue-950 text-sky-300 border border-blue-800 print:bg-blue-100 print:text-blue-800"
                          }`}>
                            {seat.gender}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400 print:text-black">
                          Rs. {seat.fare.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary & Contact Bar */}
            <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 print:border-gray-400">
              
              {/* Contact Information */}
              <div className="space-y-2 text-xs text-slate-400 print:text-gray-700">
                <span className="font-bold text-slate-300 uppercase tracking-wider block print:text-black">
                  Contact Information
                </span>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-white print:text-black font-medium">{booking.contactPhone}</span>
                </div>
                {booking.user?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-white print:text-black font-medium">{booking.user.email}</span>
                  </div>
                )}
                {latestPayment?.transactionRef && (
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    Txn Ref: {latestPayment.transactionRef}
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3 print:bg-gray-100 print:border-gray-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 print:text-gray-600">Payment Mode:</span>
                  <span className="font-bold text-white print:text-black">
                    {latestPayment?.method === "CASH" ? "Cash at Terminal" : "Online Instant Pay"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 print:text-gray-600">Payment Status:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                    booking.paymentStatus === "PAID"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}>
                    {booking.paymentStatus}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between print:border-gray-300">
                  <span className="font-bold text-white print:text-black">Total Amount:</span>
                  <span className="text-xl font-black text-emerald-400 print:text-black">
                    Rs. {booking.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Ticket Footer Instructions */}
          <div className="bg-slate-950 p-4 sm:p-5 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 print:bg-white print:text-gray-600 print:border-t-2">
            <p className="font-semibold text-slate-300 print:text-black">Boarding Guidelines:</p>
            <p>1. Please arrive at the terminal at least 30 minutes prior to scheduled departure.</p>
            <p>2. Bring original CNIC of all traveling passengers along with this E-Ticket copy or PNR SMS.</p>
            <p>3. Free baggage allowance: up to 30 kg per passenger. Excess luggage is subject to terminal tariffs.</p>
          </div>

        </div>

        {/* Action Buttons (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 print:hidden">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Book Another Journey</span>
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isConfirmed && (
              <a
                href={`/api/bookings/${booking.pnr}/ticket`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Download Official PDF</span>
              </a>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Ticket</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
