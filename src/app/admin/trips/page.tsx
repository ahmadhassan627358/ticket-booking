"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Plus,
  Search,
  Sparkles,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Bus,
  Navigation,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { SingleTripSchema, BulkTripGeneratorSchema } from "@/lib/adminValidations";

interface RouteOption {
  id: string;
  name: string;
}

interface BusOption {
  id: string;
  number: string;
  type: string;
  layout: string;
  totalSeats: number;
}

interface AdminTripItem {
  id: string;
  routeId: string;
  routeName: string;
  direction: "FORWARD" | "REVERSE";
  busId: string;
  busNumber: string;
  busType: string;
  busLayout: string;
  totalSeats: number;
  departureTime: string;
  status: string;
  bookingsCount: number;
  bookedSeatsCount: number;
  stops: Array<{ cityName: string; fare: number }>;
  createdAt: string;
}

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<AdminTripItem[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Single Trip Modal
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [singleRouteId, setSingleRouteId] = useState("");
  const [singleBusId, setSingleBusId] = useState("");
  const [singleDirection, setSingleDirection] = useState<"FORWARD" | "REVERSE">("FORWARD");
  const [singleDepartureTime, setSingleDepartureTime] = useState("");
  const [singleModalError, setSingleModalError] = useState<string | null>(null);
  const [savingSingle, setSavingSingle] = useState(false);

  // Bulk Generator Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRouteId, setBulkRouteId] = useState("");
  const [bulkBusId, setBulkBusId] = useState("");
  const [bulkDirection, setBulkDirection] = useState<"FORWARD" | "REVERSE" | "BOTH">("BOTH");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [bulkTimeSlots, setBulkTimeSlots] = useState<string[]>(["08:00", "14:00", "20:00"]);
  const [newSlotInput, setNewSlotInput] = useState("");
  const [bulkModalError, setBulkModalError] = useState<string | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);

  // Trip Cancellation Dialog State
  const [cancellingTrip, setCancellingTrip] = useState<AdminTripItem | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Trips from Server API
  const fetchTrips = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        status: statusFilter,
        routeId: routeFilter,
      });

      const res = await fetch(`/api/admin/trips?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTrips(data.trips || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch {
      showToast("error", "Failed to load trips.");
    } finally {
      setLoading(false);
    }
  };

  // Load Master Routes & Buses
  const loadOptions = async () => {
    try {
      const [routesRes, busesRes] = await Promise.all([
        fetch("/api/admin/routes"),
        fetch("/api/admin/buses"),
      ]);

      if (routesRes.ok && busesRes.ok) {
        const routesData = await routesRes.json();
        const busesData = await busesRes.json();
        setRoutes(routesData.routes || []);
        setBuses(busesData.buses || []);
      }
    } catch {
      showToast("error", "Failed to load route options.");
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [page, search, statusFilter, routeFilter]);

  // Open Single Trip Modal
  const handleOpenSingleModal = () => {
    setSingleRouteId(routes[0]?.id || "");
    setSingleBusId(buses[0]?.id || "");
    setSingleDirection("FORWARD");
    // Default tomorrow at 09:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localIso = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    setSingleDepartureTime(localIso);
    setSingleModalError(null);
    setShowSingleModal(true);
  };

  // Open Bulk Generator Modal
  const handleOpenBulkModal = () => {
    setBulkRouteId(routes[0]?.id || "");
    setBulkBusId(buses[0]?.id || "");
    setBulkDirection("BOTH");

    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split("T")[0];

    setBulkStartDate(today);
    setBulkEndDate(nextWeekStr);
    setBulkTimeSlots(["08:00", "14:00", "20:00"]);
    setBulkModalError(null);
    setShowBulkModal(true);
  };

  // Add Time Slot to Bulk
  const addTimeSlot = () => {
    if (!newSlotInput.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) {
      setBulkModalError("Please enter time in HH:mm format (e.g. 09:30 or 18:00).");
      return;
    }
    if (!bulkTimeSlots.includes(newSlotInput)) {
      setBulkTimeSlots([...bulkTimeSlots, newSlotInput].sort());
      setNewSlotInput("");
      setBulkModalError(null);
    }
  };

  const removeTimeSlot = (slot: string) => {
    if (bulkTimeSlots.length <= 1) {
      setBulkModalError("At least one time slot is required.");
      return;
    }
    setBulkTimeSlots(bulkTimeSlots.filter((s) => s !== slot));
  };

  // Submit Single Trip
  const handleSaveSingleTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleModalError(null);

    const payload = {
      routeId: singleRouteId,
      busId: singleBusId,
      direction: singleDirection,
      departureTime: singleDepartureTime,
    };

    const validation = SingleTripSchema.safeParse(payload);
    if (!validation.success) {
      setSingleModalError(validation.error.errors[0]?.message || "Invalid trip details");
      return;
    }

    setSavingSingle(true);
    try {
      const res = await fetch("/api/admin/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setSingleModalError(data.error || "Failed to create trip.");
      } else {
        showToast("success", data.message || "Trip scheduled successfully.");
        setShowSingleModal(false);
        fetchTrips();
      }
    } catch {
      setSingleModalError("Network error while creating trip.");
    } finally {
      setSavingSingle(false);
    }
  };

  // Submit Bulk Generator
  const handleSaveBulkTrips = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkModalError(null);

    const payload = {
      routeId: bulkRouteId,
      busId: bulkBusId,
      direction: bulkDirection,
      startDate: bulkStartDate,
      endDate: bulkEndDate,
      timeSlots: bulkTimeSlots,
    };

    const validation = BulkTripGeneratorSchema.safeParse(payload);
    if (!validation.success) {
      setBulkModalError(validation.error.errors[0]?.message || "Invalid generator inputs");
      return;
    }

    setSavingBulk(true);
    try {
      const res = await fetch("/api/admin/trips/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setBulkModalError(data.error || "Failed to generate bulk trips.");
      } else {
        showToast("success", data.message || `Bulk generator created trips successfully.`);
        setShowBulkModal(false);
        fetchTrips();
      }
    } catch {
      setBulkModalError("Network error while generating trips.");
    } finally {
      setSavingBulk(false);
    }
  };

  // Confirm Trip Cancellation
  const handleConfirmCancelTrip = async () => {
    if (!cancellingTrip) return;
    setCancelLoading(true);

    try {
      const res = await fetch(`/api/admin/trips/${cancellingTrip.id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Failed to cancel trip.");
      } else {
        showToast("success", data.message || "Trip cancelled with 100% full refund.");
        fetchTrips();
      }
    } catch {
      showToast("error", "Network error while cancelling trip.");
    } finally {
      setCancelLoading(false);
      setCancellingTrip(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Trip Scheduling</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Trips &amp; Bulk Schedule Generator
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Schedule individual bus departures or generate recurring trips across date ranges with full cancellation and refund control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenSingleModal}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Schedule Single Trip</span>
          </button>

          <button
            type="button"
            onClick={handleOpenBulkModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            <span>Bulk Trip Generator</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 shadow-xl animate-in fade-in ${
          toast.type === "success"
            ? "bg-emerald-950/90 border-emerald-700 text-emerald-200"
            : "bg-red-950/90 border-red-800 text-red-200"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <div className="flex-1 font-semibold">{toast.message}</div>
        </div>
      )}

      {/* Filter & Data Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        
        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search route or bus..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

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
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        </div>

        {/* Trips Table */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading scheduled trips...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No trips found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Departure Time</th>
                  <th className="py-3 px-4">Route &amp; Direction</th>
                  <th className="py-3 px-4">Assigned Bus</th>
                  <th className="py-3 px-4">Bookings</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trips.map((trip) => {
                  const isCancelled = trip.status === "CANCELLED";
                  const isCompleted = trip.status === "COMPLETED";

                  return (
                    <tr key={trip.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">
                          {new Date(trip.departureTime).toLocaleDateString("en-PK", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-sky-400 font-semibold text-xs mt-0.5">
                          {new Date(trip.departureTime).toLocaleTimeString("en-PK", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{trip.routeName}</div>
                        <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          trip.direction === "FORWARD"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-purple-950 text-purple-300 border border-purple-800"
                        }`}>
                          {trip.direction}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-200 font-bold">{trip.busNumber}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {trip.busType} ({trip.busLayout}) • {trip.totalSeats} seats
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-200">{trip.bookedSeatsCount}</span>
                        <span className="text-slate-400"> / {trip.totalSeats} Seats</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {trip.bookingsCount} Booking(s)
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase ${
                          trip.status === "SCHEDULED"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : isCancelled
                            ? "bg-red-950 text-red-300 border border-red-800"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {trip.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {!isCancelled && !isCompleted ? (
                          <button
                            type="button"
                            onClick={() => setCancellingTrip(trip)}
                            className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-900/60 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Trip</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">No actions</span>
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
              Showing Page {page} of {totalPages} ({totalCount} total trips)
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

      {/* Schedule Single Trip Modal */}
      {showSingleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Schedule Single Trip</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSingleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {singleModalError && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{singleModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSingleTrip} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Route
                </label>
                <select
                  value={singleRouteId}
                  onChange={(e) => setSingleRouteId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bus Assigned
                  </label>
                  <select
                    value={singleBusId}
                    onChange={(e) => setSingleBusId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  >
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.number} ({b.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Direction
                  </label>
                  <select
                    value={singleDirection}
                    onChange={(e) => setSingleDirection(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
                  >
                    <option value="FORWARD">FORWARD</option>
                    <option value="REVERSE">REVERSE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Departure Date &amp; Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={singleDepartureTime}
                  onChange={(e) => setSingleDepartureTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSingleModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSingle}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                >
                  {savingSingle ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Schedule Trip"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Trip Generator Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Bulk Trip Schedule Generator</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bulkModalError && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{bulkModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBulkTrips} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Route <span className="text-red-400">*</span>
                </label>
                <select
                  value={bulkRouteId}
                  onChange={(e) => setBulkRouteId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Coach Assigned
                  </label>
                  <select
                    value={bulkBusId}
                    onChange={(e) => setBulkBusId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  >
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.number} ({b.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Direction
                  </label>
                  <select
                    value={bulkDirection}
                    onChange={(e) => setBulkDirection(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
                  >
                    <option value="BOTH">BOTH (Forward + Reverse)</option>
                    <option value="FORWARD">FORWARD Only</option>
                    <option value="REVERSE">REVERSE Only</option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    End Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Daily Time Slots */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Daily Departure Time Slots ({bulkTimeSlots.length})
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {bulkTimeSlots.map((slot) => (
                    <span
                      key={slot}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-sky-300 text-xs font-mono font-bold"
                    >
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>{slot}</span>
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(slot)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="HH:mm (e.g. 16:30)"
                    value={newSlotInput}
                    onChange={(e) => setNewSlotInput(e.target.value)}
                    className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-white w-32 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                  >
                    Add Slot
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBulk}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                >
                  {savingBulk ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Bulk Trips</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Trip Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!cancellingTrip}
        title={`Cancel Trip: ${cancellingTrip?.routeName}?`}
        message={
          cancellingTrip
            ? `⚠️ WARNING: Cancelling this trip will automatically cancel all ${cancellingTrip.bookingsCount} booking(s) and issue a 100% full refund to affected passengers. All reserved seats will be released.`
            : ""
        }
        confirmText="Yes, Cancel Trip & Refund Bookings"
        isDestructive={true}
        loading={cancelLoading}
        onConfirm={handleConfirmCancelTrip}
        onCancel={() => setCancellingTrip(null)}
      />

    </div>
  );
}
