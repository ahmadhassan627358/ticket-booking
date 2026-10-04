"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Ticket,
  Bus,
  Clock,
  Calendar,
  MapPin,
  Users,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { maskCNIC } from "@/lib/ticketPdf";

interface TrackedBooking {
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
    bus: {
      number: string;
      type: string;
      layout: string;
    };
    route: {
      name: string;
    };
  };
  seats: Array<{
    id: string;
    seatNo: number;
    passengerName: string;
    cnic: string;
    gender: string;
    fare: number;
    fromStop: { city: { name: string } };
    toStop: { city: { name: string } };
  }>;
}

interface RefundPreview {
  hoursRemaining: number;
  refundPercentage: number;
  refundAmount: number;
  tierDescription: string;
  isAllowed: boolean;
  message?: string;
}

function TrackContent() {
  const searchParams = useSearchParams();
  const initialPnr = searchParams.get("pnr") || "";
  const initialPhone = searchParams.get("phone") || "";

  const [pnr, setPnr] = useState(initialPnr);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<TrackedBooking | null>(null);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [previewingRefund, setPreviewingRefund] = useState(false);
  const [refundPreview, setRefundPreview] = useState<RefundPreview | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pnr.trim() || !phone.trim()) {
      setError("Please enter both your 8-character PNR code and contact mobile number.");
      return;
    }

    setLoading(true);
    setError(null);
    setBooking(null);
    setCancelSuccess(null);

    try {
      const res = await fetch("/api/bookings/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pnr: pnr.trim(), phone: phone.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No booking found matching your details.");
      } else {
        setBooking(data.booking);
      }
    } catch {
      setError("Network error while tracking your ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if query params present
  useEffect(() => {
    if (initialPnr && initialPhone) {
      handleSearch();
    }
  }, [initialPnr, initialPhone]);

  // Open cancellation modal and fetch preview
  const handleOpenCancelModal = async () => {
    if (!booking) return;
    setShowCancelModal(true);
    setPreviewingRefund(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${booking.pnr}/cancel`);
      const data = await res.json();
      if (res.ok) {
        setRefundPreview(data);
      } else {
        setError(data.error || "Unable to calculate refund policy.");
      }
    } catch {
      setError("Failed to load cancellation terms.");
    } finally {
      setPreviewingRefund(false);
    }
  };

  // Confirm cancellation
  const handleConfirmCancel = async () => {
    if (!booking) return;
    setCancelling(true);

    try {
      const res = await fetch(`/api/bookings/${booking.pnr}/cancel`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Cancellation failed. Please try again.");
        setShowCancelModal(false);
      } else {
        setCancelSuccess(
          `Booking ${data.pnr} successfully cancelled! ${
            data.refundAmount > 0
              ? `A refund of Rs. ${data.refundAmount.toLocaleString()} (${data.refundPercentage}%) has been processed.`
              : "Reservation cancelled."
          }`
        );
        setShowCancelModal(false);
        // Refresh booking state
        setBooking((prev) =>
          prev
            ? {
                ...prev,
                status: "CANCELLED",
                paymentStatus: data.paymentStatus,
              }
            : null
        );
      }
    } catch {
      setError("Connection error while cancelling booking.");
      setShowCancelModal(false);
    } finally {
      setCancelling(false);
    }
  };

  const firstSeat = booking?.seats[0];
  const fromCity = firstSeat?.fromStop?.city?.name || "Origin";
  const toCity = firstSeat?.toStop?.city?.name || "Destination";
  const isConfirmed = booking?.status === "CONFIRMED";
  const isCancelled = booking?.status === "CANCELLED";

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 border border-blue-800/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-950/80 text-sky-400 border border-blue-800 mx-auto">
            <Ticket className="w-3.5 h-3.5" />
            <span>Public Ticket Tracking &amp; Download</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Track &amp; Manage Your Ticket
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
            Find your bus booking, download official E-Ticket PDF with QR code, or manage cancellation without needing to login.
          </p>
        </div>

        {/* Search Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  8-Character PNR Reference <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="e.g. 2WMJP2CU"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-2xl text-sm font-mono tracking-widest text-white uppercase focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contact Mobile Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="0300-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-2xl text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Searching Records...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Find Ticket Details</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Cancellation Success Alert */}
        {cancelSuccess && (
          <div className="p-5 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-sm flex items-start gap-3 shadow-xl animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white text-base">Cancellation Complete</div>
              <div className="text-xs text-emerald-200 mt-1">{cancelSuccess}</div>
            </div>
          </div>
        )}

        {/* Booking Details Result Card */}
        {booking && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in">

            {/* Top Bar with PNR & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
              <div>
                <div className="text-xs text-slate-400">PNR Reference</div>
                <div className="text-2xl font-black font-mono tracking-wider text-sky-400 mt-0.5">
                  {booking.pnr}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isConfirmed
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : isCancelled
                    ? "bg-red-950 text-red-300 border border-red-800"
                    : "bg-amber-950 text-amber-300 border border-amber-800"
                }`}>
                  {booking.status}
                </span>

                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  booking.paymentStatus === "PAID"
                    ? "bg-blue-950 text-sky-300 border border-blue-800"
                    : booking.paymentStatus === "REFUNDED"
                    ? "bg-purple-950 text-purple-300 border border-purple-800"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}>
                  Payment: {booking.paymentStatus}
                </span>
              </div>
            </div>

            {/* Journey Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Route &amp; Journey</span>
                <div className="text-base font-bold text-white mt-1">
                  {fromCity} → {toCity}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{booking.trip.route.name}</div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Date &amp; Departure</span>
                <div className="text-sm font-semibold text-white mt-1">
                  {new Date(booking.trip.departureTime).toLocaleDateString("en-PK", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="text-xs text-sky-400 font-bold mt-0.5">
                  {new Date(booking.trip.departureTime).toLocaleTimeString("en-PK", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Bus &amp; Seats</span>
                <div className="text-sm font-bold text-white mt-1">
                  {booking.trip.bus.type} ({booking.trip.bus.layout})
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Seats: {booking.seats.length > 0 ? booking.seats.map((s) => `#${s.seatNo}`).join(", ") : "Released"}
                </div>
              </div>
            </div>

            {/* Passenger Roster */}
            {booking.seats.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Passenger Roster</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-2 px-3">Seat</th>
                        <th className="py-2 px-3">Passenger</th>
                        <th className="py-2 px-3">CNIC (Masked)</th>
                        <th className="py-2 px-3">Gender</th>
                        <th className="py-2 px-3 text-right">Fare</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {booking.seats.map((seat) => (
                        <tr key={seat.id} className="hover:bg-slate-950/40">
                          <td className="py-2.5 px-3">
                            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black inline-flex items-center justify-center text-xs">
                              {seat.seatNo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">{seat.passengerName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{maskCNIC(seat.cnic)}</td>
                          <td className="py-2.5 px-3 text-slate-300">{seat.gender}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            Rs. {seat.fare.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* PDF Download Button */}
                {isConfirmed ? (
                  <a
                    href={`/api/bookings/${booking.pnr}/ticket`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official PDF Ticket</span>
                  </a>
                ) : (
                  <button
                    disabled
                    title="PDF download is only available for CONFIRMED tickets"
                    className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF (Available after Confirmation)</span>
                  </button>
                )}

                <Link
                  href={`/booking/${booking.pnr}`}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all inline-flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Web Ticket</span>
                </Link>
              </div>

              {/* Cancellation Button */}
              {!isCancelled && booking.status !== "COMPLETED" && (
                <button
                  type="button"
                  onClick={handleOpenCancelModal}
                  className="px-4 py-2.5 rounded-xl bg-red-950/80 border border-red-700 hover:bg-red-900 text-red-200 font-bold text-xs transition-all inline-flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span>Cancel Reservation</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Cancellation Modal with Refund Preview */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-red-950 border border-red-700 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Confirm Cancellation</h3>
              <p className="text-xs text-slate-400">
                Ticket Reference: <span className="font-mono text-white font-bold">{booking?.pnr}</span>
              </p>
            </div>

            {previewingRefund ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Calculating refund policy tier...</p>
              </div>
            ) : refundPreview ? (
              <div className="space-y-3">
                {/* Refund Tier Card */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Departure In:</span>
                    <span className="font-bold text-white">{refundPreview.hoursRemaining} hours</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Policy Tier:</span>
                    <span className="font-bold text-sky-300">{refundPreview.refundPercentage}% Refund</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Total Ticket Fare:</span>
                    <span className="text-slate-200">Rs. {booking?.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-white">Refund to Return:</span>
                    <span className="text-lg font-black text-emerald-400">
                      Rs. {refundPreview.refundAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  ℹ️ Once cancelled, your seats will be released immediately for other passengers.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Keep Ticket
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                    className="py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    {cancelling ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Confirm Cancel</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Ticket Tracker...</div>}>
      <TrackContent />
    </Suspense>
  );
}
