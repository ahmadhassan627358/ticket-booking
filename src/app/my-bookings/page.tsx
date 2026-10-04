"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ticket,
  Bus,
  Calendar,
  Clock,
  ArrowRight,
  Download,
  XCircle,
  Eye,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Check,
} from "lucide-react";
import { maskCNIC } from "@/lib/ticketPdf";

interface BookingSeat {
  id: string;
  seatNo: number;
  passengerName: string;
  cnic: string;
  gender: string;
  fare: number;
  fromStop: { city: { name: string } };
  toStop: { city: { name: string } };
}

interface MyBookingItem {
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
    };
    route: {
      name: string;
    };
  };
  seats: BookingSeat[];
}

interface RefundPreview {
  hoursRemaining: number;
  refundPercentage: number;
  refundAmount: number;
  tierDescription: string;
  isAllowed: boolean;
  message?: string;
}

export default function MyBookingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [bookings, setBookings] = useState<MyBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Cancellation Modal State
  const [selectedBooking, setSelectedBooking] = useState<MyBookingItem | null>(null);
  const [refundPreview, setRefundPreview] = useState<RefundPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch user bookings
  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/bookings/my");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error("Error fetching my bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/my-bookings");
    } else if (authStatus === "authenticated") {
      fetchBookings();
    }
  }, [authStatus, router]);

  // Open cancellation modal
  const handleOpenCancelModal = async (b: MyBookingItem) => {
    setSelectedBooking(b);
    setRefundPreview(null);
    setPreviewLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/bookings/${b.pnr}/cancel`);
      const data = await res.json();
      if (res.ok) {
        setRefundPreview(data);
      } else {
        setActionMessage({ type: "error", text: data.error || "Unable to calculate refund policy." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error loading cancellation details." });
    } finally {
      setPreviewLoading(false);
    }
  };

  // Confirm cancel
  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;
    setCancelling(true);

    try {
      const res = await fetch(`/api/bookings/${selectedBooking.pnr}/cancel`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setActionMessage({ type: "error", text: data.error || "Failed to cancel reservation." });
        setSelectedBooking(null);
      } else {
        setActionMessage({
          type: "success",
          text: `Booking ${data.pnr} cancelled. ${
            data.refundAmount > 0
              ? `Refund of Rs. ${data.refundAmount.toLocaleString()} (${data.refundPercentage}%) issued.`
              : "Seats released."
          }`,
        });
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch {
      setActionMessage({ type: "error", text: "Connection error while cancelling." });
      setSelectedBooking(null);
    } finally {
      setCancelling(false);
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-white bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-300 font-medium">Loading your ticket reservations...</p>
        </div>
      </div>
    );
  }

  const now = new Date();

  const upcomingBookings = bookings.filter((b) => {
    const depTime = new Date(b.trip.departureTime);
    return depTime > now && b.status !== "COMPLETED";
  });

  const pastBookings = bookings.filter((b) => {
    const depTime = new Date(b.trip.departureTime);
    return depTime <= now || b.status === "COMPLETED";
  });

  const displayedBookings = activeTab === "upcoming" ? upcomingBookings : pastBookings;

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Ticket className="w-7 h-7 text-sky-400" />
              <span>My Ticket Reservations</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Logged in as <span className="text-sky-300 font-semibold">{session?.user?.name}</span> ({session?.user?.email})
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all self-start sm:self-auto"
          >
            <span>Book New Ticket</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Action Status Banner */}
        {actionMessage && (
          <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 shadow-xl animate-in fade-in ${
            actionMessage.type === "success"
              ? "bg-emerald-950/80 border-emerald-700 text-emerald-200"
              : "bg-red-950/80 border-red-800 text-red-200"
          }`}>
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{actionMessage.text}</div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "upcoming"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Upcoming Journeys ({upcomingBookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("past")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "past"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Past &amp; Completed ({pastBookings.length})</span>
          </button>
        </div>

        {/* Bookings List */}
        {displayedBookings.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center mx-auto text-sky-400">
              <Bus className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">
              No {activeTab === "upcoming" ? "Upcoming" : "Past"} Bookings
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              {activeTab === "upcoming"
                ? "You have no scheduled trips coming up. Search comfortable buses between major Pakistani cities."
                : "No past travel records found in your account."}
            </p>
            {activeTab === "upcoming" && (
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
                >
                  <span>Search Scheduled Buses</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedBookings.map((b) => {
              const firstSeat = b.seats[0];
              const fromCity = firstSeat?.fromStop?.city?.name || "Origin";
              const toCity = firstSeat?.toStop?.city?.name || "Destination";
              const isConfirmed = b.status === "CONFIRMED";
              const isCancelled = b.status === "CANCELLED";

              return (
                <div
                  key={b.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-3 py-1 rounded-lg">
                        PNR: {b.pnr}
                      </span>
                      <span className="text-xs text-slate-400">
                        Booked on {new Date(b.createdAt).toLocaleDateString("en-PK")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                        isConfirmed
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : isCancelled
                          ? "bg-red-950 text-red-300 border border-red-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}>
                        {b.status}
                      </span>

                      <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                        b.paymentStatus === "PAID"
                          ? "bg-blue-950 text-sky-300 border border-blue-800"
                          : b.paymentStatus === "REFUNDED"
                          ? "bg-purple-950 text-purple-300 border border-purple-800"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}>
                        {b.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Card Journey Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-slate-400 uppercase font-semibold text-[10px]">Journey Route</div>
                      <div className="font-bold text-white text-sm mt-0.5">{fromCity} → {toCity}</div>
                      <div className="text-slate-400 mt-0.5">{b.trip.bus.type} ({b.trip.bus.layout}) • #{b.trip.bus.number}</div>
                    </div>

                    <div>
                      <div className="text-slate-400 uppercase font-semibold text-[10px]">Departure Time</div>
                      <div className="font-bold text-slate-200 text-sm mt-0.5">
                        {new Date(b.trip.departureTime).toLocaleDateString("en-PK", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-sky-400 font-bold mt-0.5">
                        {new Date(b.trip.departureTime).toLocaleTimeString("en-PK", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-slate-400 uppercase font-semibold text-[10px]">Seats &amp; Total Fare</div>
                      <div className="text-emerald-400 font-black text-base mt-0.5">
                        Rs. {b.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        Seats: {b.seats.length > 0 ? b.seats.map((s) => `#${s.seatNo}`).join(", ") : "Released"}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {/* Web Ticket View */}
                      <Link
                        href={`/booking/${b.pnr}`}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </Link>

                      {/* PDF Download Button */}
                      {isConfirmed && (
                        <a
                          href={`/api/bookings/${b.pnr}/ticket`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF Ticket</span>
                        </a>
                      )}
                    </div>

                    {/* Cancellation Button (Only if Upcoming & not cancelled) */}
                    {activeTab === "upcoming" && !isCancelled && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(b)}
                        className="px-3.5 py-2 rounded-xl bg-red-950/80 border border-red-700 hover:bg-red-900 text-red-200 font-bold text-xs transition-all inline-flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Cancellation Confirmation Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-red-950 border border-red-700 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Cancel Reservation</h3>
              <p className="text-xs text-slate-400">
                PNR: <span className="font-mono text-white font-bold">{selectedBooking.pnr}</span>
              </p>
            </div>

            {previewLoading ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Calculating refund tier...</p>
              </div>
            ) : refundPreview ? (
              <div className="space-y-3">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Departure In:</span>
                    <span className="font-bold text-white">{refundPreview.hoursRemaining} hours</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Refund Tier:</span>
                    <span className="font-bold text-sky-300">{refundPreview.refundPercentage}% Refund</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Paid Fare:</span>
                    <span className="text-slate-200">Rs. {selectedBooking.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-white">Refund Amount:</span>
                    <span className="text-lg font-black text-emerald-400">
                      Rs. {refundPreview.refundAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  ⚠️ Your reserved seats will be released immediately for other waiting passengers.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Keep Booking
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
