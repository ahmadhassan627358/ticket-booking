"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Filter,
  Ticket,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Printer,
  FileText,
  User,
  Phone,
  Clock,
  Bus,
  Navigation,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Check,
  RotateCcw,
} from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

interface RouteOption {
  id: string;
  name: string;
}

interface BookingSeatItem {
  id: string;
  seatNo: number;
  passengerName: string;
  cnic: string;
  gender: string;
  fromCity: string;
  toCity: string;
  fare: number;
}

interface PaymentItem {
  id: string;
  method: string;
  amount: number;
  status: string;
  transactionRef: string | null;
  createdAt: string;
}

interface AdminBookingItem {
  id: string;
  pnr: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  contactPhone: string;
  totalAmount: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  trip: {
    id: string;
    departureTime: string;
    direction: "FORWARD" | "REVERSE";
    status: string;
    busNumber: string;
    busType: string;
    routeName: string;
    originCity: string;
    destCity: string;
  };
  seats: BookingSeatItem[];
  seatNumbers: number[];
  seatsCount: number;
  payments: PaymentItem[];
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // Selected Booking for Detailed Modal
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingItem | null>(null);

  // Confirm Cash Payment Dialog
  const [confirmingPaymentBooking, setConfirmingPaymentBooking] = useState<AdminBookingItem | null>(null);
  const [confirmingLoading, setConfirmingLoading] = useState(false);

  // Cancel Booking Dialog
  const [cancellingBooking, setCancellingBooking] = useState<AdminBookingItem | null>(null);
  const [cancelRefundFull, setCancelRefundFull] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Route Options
  const loadRoutes = async () => {
    try {
      const res = await fetch("/api/admin/routes");
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
      }
    } catch (err) {
      console.error("Failed to load routes:", err);
    }
  };

  // Load Bookings with Filters
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        date: dateFilter,
        routeId: routeFilter,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
      });

      const res = await fetch(`/api/admin/bookings?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch {
      showToast("error", "Failed to load bookings list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [page, search, dateFilter, routeFilter, statusFilter, paymentStatusFilter]);

  // Handle Confirm Cash Payment
  const handleConfirmCashPayment = async () => {
    if (!confirmingPaymentBooking) return;
    setConfirmingLoading(true);

    try {
      const res = await fetch(`/api/admin/bookings/${confirmingPaymentBooking.id}/confirm-payment`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Failed to confirm cash payment.");
      } else {
        showToast("success", data.message || `Cash payment confirmed for PNR ${confirmingPaymentBooking.pnr}.`);
        if (selectedBooking && selectedBooking.id === confirmingPaymentBooking.id) {
          setSelectedBooking((prev) =>
            prev
              ? {
                  ...prev,
                  status: "CONFIRMED",
                  paymentStatus: "PAID",
                }
              : null
          );
        }
        fetchBookings();
      }
    } catch {
      showToast("error", "Network error while confirming payment.");
    } finally {
      setConfirmingLoading(false);
      setConfirmingPaymentBooking(null);
    }
  };

  // Handle Cancel Booking with Refund
  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    setCancelLoading(true);

    try {
      const res = await fetch(`/api/admin/bookings/${cancellingBooking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullRefund: cancelRefundFull,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Failed to cancel booking.");
      } else {
        showToast("success", data.message || `Booking ${cancellingBooking.pnr} cancelled with refund.`);
        if (selectedBooking && selectedBooking.id === cancellingBooking.id) {
          setSelectedBooking((prev) =>
            prev
              ? {
                  ...prev,
                  status: "CANCELLED",
                  paymentStatus: prev.paymentStatus === "PAID" ? "REFUNDED" : "UNPAID",
                }
              : null
          );
        }
        fetchBookings();
      }
    } catch {
      showToast("error", "Network error while cancelling booking.");
    } finally {
      setCancelLoading(false);
      setCancellingBooking(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setDateFilter("");
    setRouteFilter("ALL");
    setStatusFilter("ALL");
    setPaymentStatusFilter("ALL");
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Ticket className="w-4 h-4" />
            <span>Passenger Reservations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Bookings &amp; Reservation Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search customer reservations by PNR, passenger phone, or name. Confirm cash payments, view full passenger manifests, and issue refunds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Table</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 shadow-xl animate-in fade-in ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-700 text-emerald-200"
              : "bg-red-950/90 border-red-800 text-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <div className="flex-1 font-semibold">{toast.message}</div>
        </div>
      )}

      {/* Filters & Data Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search PNR, Phone, or Name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Date Picker */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
              title="Filter by travel date or booking date"
            />
          </div>

          {/* Route Filter */}
          <div>
            <select
              value={routeFilter}
              onChange={(e) => {
                setRouteFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 font-semibold"
            >
              <option value="ALL">All Routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Booking Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 font-semibold"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">PAID</option>
              <option value="UNPAID">UNPAID</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>

            {(search || dateFilter || routeFilter !== "ALL" || statusFilter !== "ALL" || paymentStatusFilter !== "ALL") && (
              <button
                type="button"
                onClick={resetFilters}
                title="Reset all filters"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bookings Table */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading passenger reservations...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-slate-300">No bookings found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No reservation records matched your search query or filter criteria. Try adjusting the filters above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">PNR &amp; Created</th>
                  <th className="py-3 px-4">Customer &amp; Contact</th>
                  <th className="py-3 px-4">Trip Corridor &amp; Departure</th>
                  <th className="py-3 px-4">Seats Reserved</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status &amp; Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map((booking) => {
                  const isCash = booking.paymentMethod === "CASH";
                  const isUnpaid = booking.paymentStatus === "UNPAID";
                  const isCancelled = booking.status === "CANCELLED";
                  const isConfirmed = booking.status === "CONFIRMED";
                  const depDate = new Date(booking.trip.departureTime);

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-950/40 transition-colors group"
                    >
                      {/* PNR & Date */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className="font-mono font-black text-sm text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1.5"
                        >
                          <span>{booking.pnr}</span>
                        </button>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          {new Date(booking.createdAt).toLocaleDateString("en-PK", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      {/* Customer Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">
                          {booking.customerName}
                        </div>
                        <div className="text-slate-400 text-[11px] font-mono mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{booking.contactPhone}</span>
                        </div>
                      </td>

                      {/* Journey & Departure */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {booking.trip.routeName}
                        </div>
                        <div className="text-[11px] text-sky-400 mt-0.5 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-sky-400" />
                          <span>
                            {depDate.toLocaleDateString("en-PK", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            •{" "}
                            {depDate.toLocaleTimeString("en-PK", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Seats */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {booking.seatNumbers.map((seatNo) => (
                            <span
                              key={seatNo}
                              className="px-2 py-0.5 rounded-md bg-slate-800 text-sky-300 font-mono font-bold text-[11px] border border-slate-700"
                            >
                              Seat {seatNo}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {booking.seatsCount} passenger(s)
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">
                          Rs. {booking.totalAmount.toLocaleString()}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          {booking.paymentMethod}
                        </span>
                      </td>

                      {/* Status Badges */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                                isConfirmed
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : booking.status === "PENDING"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : isCancelled
                                  ? "bg-red-950 text-red-300 border border-red-800"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                booking.paymentStatus === "PAID"
                                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                                  : booking.paymentStatus === "REFUNDED"
                                  ? "bg-purple-950/80 text-purple-300 border border-purple-800/60"
                                  : "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                              }`}
                            >
                              {booking.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          title="View Full Booking Manifest"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors inline-flex items-center"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Confirm Cash Payment Button */}
                        {isUnpaid && !isCancelled && (
                          <button
                            type="button"
                            onClick={() => setConfirmingPaymentBooking(booking)}
                            title="Confirm Cash Payment"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Cash</span>
                          </button>
                        )}

                        {/* Cancel with Refund Button */}
                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => setCancellingBooking(booking)}
                            title="Cancel Booking & Issue Refund"
                            className="px-2.5 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-900/60 text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page {page} of {totalPages} ({totalCount} total bookings)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-black text-white">
                    PNR: <span className="text-sky-400">{selectedBooking.pnr}</span>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedBooking.status === "CONFIRMED"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : selectedBooking.status === "CANCELLED"
                        ? "bg-red-950 text-red-300 border border-red-800"
                        : "bg-amber-950 text-amber-300 border border-amber-800"
                    }`}
                  >
                    {selectedBooking.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Booked on {new Date(selectedBooking.createdAt).toLocaleString("en-PK")}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Journey & Customer Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                <div className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  <span>Journey &amp; Departure</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {selectedBooking.trip.routeName}
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {new Date(selectedBooking.trip.departureTime).toLocaleString("en-PK", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedBooking.trip.busNumber} ({selectedBooking.trip.busType})
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                <div className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Customer Contact</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {selectedBooking.customerName}
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  Phone: {selectedBooking.contactPhone}
                </div>
                <div className="text-xs text-slate-400">
                  Email: {selectedBooking.customerEmail}
                </div>
              </div>
            </div>

            {/* Passengers & Seats Table */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Passenger Seats Manifest ({selectedBooking.seats.length})
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-900/60">
                      <th className="py-2.5 px-3">Seat #</th>
                      <th className="py-2.5 px-3">Passenger Name</th>
                      <th className="py-2.5 px-3">CNIC</th>
                      <th className="py-2.5 px-3">Gender</th>
                      <th className="py-2.5 px-3">Origin → Destination</th>
                      <th className="py-2.5 px-3 text-right">Fare</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedBooking.seats.map((seat) => (
                      <tr key={seat.id} className="hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                          Seat {seat.seatNo}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {seat.passengerName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {seat.cnic}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              seat.gender === "FEMALE"
                                ? "bg-pink-950 text-pink-300 border border-pink-800"
                                : "bg-blue-950 text-blue-300 border border-blue-800"
                            }`}
                          >
                            {seat.gender}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {seat.fromCity} → {seat.toCity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          Rs. {seat.fare.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments & Financials */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Financial Breakdown</span>
                </div>
                <div className="text-sm font-black text-emerald-400">
                  Total: Rs. {selectedBooking.totalAmount.toLocaleString()}
                </div>
              </div>

              {selectedBooking.payments.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                  {selectedBooking.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-slate-400"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase">
                          {p.method}
                        </span>
                        {p.transactionRef && (
                          <span className="font-mono text-[11px] text-slate-500">
                            (Ref: {p.transactionRef})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            p.status === "SUCCESS"
                              ? "text-emerald-400"
                              : p.status === "REFUNDED"
                              ? "text-purple-400"
                              : "text-amber-400"
                          }`}
                        >
                          Rs. {p.amount.toLocaleString()} [{p.status}]
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {selectedBooking.status === "CONFIRMED" && (
                  <Link
                    href={`/api/bookings/${selectedBooking.pnr}/ticket`}
                    target="_blank"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Download Official PDF Ticket</span>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedBooking.paymentStatus === "UNPAID" &&
                  selectedBooking.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingPaymentBooking(selectedBooking);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Cash Payment</span>
                    </button>
                  )}

                {selectedBooking.status !== "CANCELLED" && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingBooking(selectedBooking);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-900 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancel with Refund</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cash Payment Dialog */}
      {confirmingPaymentBooking && (
        <ConfirmDialog
          isOpen={!!confirmingPaymentBooking}
          title="Confirm Cash Payment"
          message={`Are you sure you want to confirm cash payment of Rs. ${confirmingPaymentBooking.totalAmount.toLocaleString()} for PNR "${confirmingPaymentBooking.pnr}" (${confirmingPaymentBooking.customerName})? This will transition ticket status to CONFIRMED and generate an official ticket.`}
          confirmLabel={confirmingLoading ? "Confirming..." : "Confirm as Paid"}
          confirmVariant="primary"
          onConfirm={handleConfirmCashPayment}
          onCancel={() => setConfirmingPaymentBooking(null)}
        />
      )}

      {/* Cancel Booking & Refund Dialog */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-950/80 border border-red-800 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Cancel Booking with Refund
                </h3>
                <p className="text-xs text-slate-400">
                  PNR: {cancellingBooking.pnr} • {cancellingBooking.customerName}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Original Ticket Fare:</span>
                <span className="font-bold text-white">
                  Rs. {cancellingBooking.totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Payment Status:</span>
                <span className="font-bold text-sky-300 uppercase">
                  {cancellingBooking.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Seats to Release:</span>
                <span className="font-mono font-bold text-amber-300">
                  {cancellingBooking.seatsCount} seat(s)
                </span>
              </div>
            </div>

            {cancellingBooking.paymentStatus === "PAID" && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Refund Processing
                </label>
                <div className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  <input
                    type="checkbox"
                    id="fullRefundToggle"
                    checked={cancelRefundFull}
                    onChange={(e) => setCancelRefundFull(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label
                    htmlFor="fullRefundToggle"
                    className="text-slate-300 cursor-pointer font-medium"
                  >
                    Grant 100% Full Refund of Rs. {cancellingBooking.totalAmount.toLocaleString()}
                  </label>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Cancelling this reservation will immediately free up the reserved seats for new customer bookings and record the cancellation in financial reports.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center gap-1.5"
              >
                {cancelLoading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
