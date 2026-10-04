"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  TrendingUp,
  Ticket,
  DollarSign,
  Bus,
  Percent,
  Calendar,
  ArrowUpRight,
  Sparkles,
  Layers,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  BarChart3,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

interface DashboardData {
  stats: {
    todayBookings: number;
    todayRevenue: number;
    seatsSold: number;
    activeTrips: number;
    avgOccupancy: number;
    totalRoutes: number;
    totalBuses: number;
  };
  last7DaysSales: Array<{
    date: string;
    dayLabel: string;
    formattedDate: string;
    revenue: number;
    bookingsCount: number;
    ticketsCount: number;
  }>;
  nextUpcomingTrips: Array<{
    id: string;
    routeId: string;
    routeName: string;
    originCity: string;
    destCity: string;
    direction: "FORWARD" | "REVERSE";
    busId: string;
    busNumber: string;
    busType: string;
    busLayout: string;
    totalSeats: number;
    bookedSeatsCount: number;
    occupancyRate: number;
    departureTime: string;
    status: string;
    bookingsCount: number;
  }>;
  adminName: string;
  adminEmail: string;
}

export default function AdminDashboardClient({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData((prev) => ({
          ...prev,
          stats: {
            ...prev.stats,
            ...json.stats,
          },
          last7DaysSales: json.last7DaysSales || prev.last7DaysSales,
          nextUpcomingTrips: json.nextUpcomingTrips || prev.nextUpcomingTrips,
        }));
      }
    } catch (err) {
      console.error("Failed to refresh dashboard:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Find max revenue for bar scaling in the chart
  const maxRevenue = Math.max(
    ...data.last7DaysSales.map((d) => d.revenue),
    5000
  );

  const total7DayRevenue = data.last7DaysSales.reduce(
    (sum, d) => sum + d.revenue,
    0
  );
  const total7DayTickets = data.last7DaysSales.reduce(
    (sum, d) => sum + d.ticketsCount,
    0
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border border-blue-800/40 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Safar Master Operations</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Executive <span className="text-sky-400">Dashboard</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Welcome back, <span className="text-white font-bold">{data.adminName}</span>. Real-time fleet operations, sales tracking, and occupancy analytics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Live Refresh"}</span>
            </button>
            <Link
              href="/admin/bookings"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Manage Bookings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 5 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Today's Bookings */}
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Today's Bookings
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center border border-blue-800/60">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {data.stats.todayBookings}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span className="text-sky-400 font-bold">Today</span>
              <span>• Total reservations placed</span>
            </div>
          </div>
        </div>

        {/* 2. Today's Revenue */}
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Today's Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              Rs. {data.stats.todayRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span className="text-emerald-400 font-bold">Paid</span>
              <span>• Settled cash &amp; online</span>
            </div>
          </div>
        </div>

        {/* 3. Seats Sold */}
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Seats Sold
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center border border-purple-800/60">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-300">
              {data.stats.seatsSold}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span className="text-purple-400 font-bold">Seats</span>
              <span>• Reserved today</span>
            </div>
          </div>
        </div>

        {/* 4. Active Trips */}
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Trips
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-800/60">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-300">
              {data.stats.activeTrips}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span className="text-amber-400 font-bold">Today</span>
              <span>• Scheduled departures</span>
            </div>
          </div>
        </div>

        {/* 5. Average Occupancy */}
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Avg Occupancy
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-950 text-sky-400 flex items-center justify-center border border-sky-800/60">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-sky-300">
              {data.stats.avgOccupancy}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, data.stats.avgOccupancy)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section: Last 7 Days' Sales */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Last 7 Days Sales Trend
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily gross sales revenue (PKR) &amp; tickets reserved over the past week
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400">7-Day Total: </span>
              <span className="font-bold text-emerald-400">
                Rs. {total7DayRevenue.toLocaleString()}
              </span>
              <span className="text-slate-500 mx-1.5">•</span>
              <span className="font-bold text-sky-300">{total7DayTickets} tickets</span>
            </div>
            <Link
              href="/admin/reports"
              className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <span>Full Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Interactive Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-64 sm:h-72 px-2">
            {data.last7DaysSales.map((day, idx) => {
              const heightPercent =
                maxRevenue > 0
                  ? Math.max(8, Math.round((day.revenue / maxRevenue) * 100))
                  : 8;
              const isHovered = hoveredBarIndex === idx;

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-16 z-20 bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-center shadow-2xl animate-in fade-in zoom-in-95 pointer-events-none whitespace-nowrap">
                      <div className="text-[11px] font-bold text-slate-300">
                        {day.formattedDate} ({day.dayLabel})
                      </div>
                      <div className="text-xs font-black text-emerald-400">
                        Rs. {day.revenue.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-sky-300 font-semibold">
                        {day.ticketsCount} tickets ({day.bookingsCount} orders)
                      </div>
                    </div>
                  )}

                  {/* Revenue Bar */}
                  <div className="w-full max-w-[48px] bg-slate-800/60 rounded-t-xl overflow-hidden flex flex-col justify-end p-1 transition-all group-hover:bg-slate-800">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 relative flex flex-col justify-between items-center py-2 ${
                        day.revenue > 0
                          ? "bg-gradient-to-t from-blue-600 via-sky-500 to-emerald-400 group-hover:from-blue-500 group-hover:to-emerald-300 shadow-lg shadow-sky-600/20"
                          : "bg-slate-800"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      {day.revenue > 0 && (
                        <span className="text-[10px] font-bold text-white hidden sm:block rotate-[-90deg] origin-center mt-2 opacity-80">
                          {day.ticketsCount > 0 ? `${day.ticketsCount} tix` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date labels */}
                  <div className="mt-3 text-center">
                    <div className="text-xs font-bold text-slate-200">
                      {day.dayLabel}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {day.formattedDate}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table Section: Next 10 Upcoming Trips with Occupancy */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Upcoming Trips &amp; Capacity Occupancy
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Next 10 scheduled bus departures with live seat reservations and occupancy %
            </p>
          </div>

          <Link
            href="/admin/trips"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>All Trips &amp; Bulk Generator</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data.nextUpcomingTrips.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No upcoming trips scheduled. Use the Bulk Generator in Trips Management to schedule new departures.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Departure Time</th>
                  <th className="py-3 px-4">Route Corridor</th>
                  <th className="py-3 px-4">Bus Fleet &amp; Type</th>
                  <th className="py-3 px-4">Occupancy Rate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.nextUpcomingTrips.map((trip) => {
                  const depDate = new Date(trip.departureTime);
                  const isToday =
                    depDate.toDateString() === new Date().toDateString();

                  // Color coding for occupancy rate
                  let occColor = "text-slate-400";
                  let progressGradient = "from-slate-600 to-slate-500";
                  if (trip.occupancyRate >= 75) {
                    occColor = "text-emerald-400";
                    progressGradient = "from-emerald-500 to-teal-400";
                  } else if (trip.occupancyRate >= 40) {
                    occColor = "text-amber-400";
                    progressGradient = "from-amber-500 to-yellow-400";
                  } else if (trip.occupancyRate > 0) {
                    occColor = "text-sky-400";
                    progressGradient = "from-sky-500 to-blue-500";
                  }

                  return (
                    <tr
                      key={trip.id}
                      className="hover:bg-slate-950/40 transition-colors"
                    >
                      {/* Departure */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              isToday ? "text-amber-400 font-extrabold" : "text-white"
                            }`}
                          >
                            {depDate.toLocaleDateString("en-PK", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60 uppercase">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="text-sky-400 font-semibold text-xs mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-400" />
                          <span>
                            {depDate.toLocaleTimeString("en-PK", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Route */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {trip.routeName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              trip.direction === "FORWARD"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-purple-950 text-purple-300 border border-purple-800"
                            }`}
                          >
                            {trip.direction}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {trip.originCity} → {trip.destCity}
                          </span>
                        </div>
                      </td>

                      {/* Bus */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-200 font-bold">
                          {trip.busNumber}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {trip.busType} ({trip.busLayout}) • {trip.totalSeats} seats
                        </div>
                      </td>

                      {/* Occupancy */}
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className={occColor}>
                            {trip.occupancyRate}% Occupied
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {trip.bookedSeatsCount} / {trip.totalSeats}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${progressGradient} transition-all duration-300`}
                            style={{
                              width: `${Math.min(100, trip.occupancyRate)}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {trip.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/trips`}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          href="/admin/bookings"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center border border-blue-800/60 group-hover:scale-105 transition-transform">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">
                Bookings Management
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Search PNR, confirm cash, or cancel with refunds
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
        </Link>

        <Link
          href="/admin/reports"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center border border-purple-800/60 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">
                Sales &amp; Financial Reports
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Per-route analytics and CSV exports
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
        </Link>

        <Link
          href="/admin/trips"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">
                Bulk Trip Generator
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Schedule recurring fleet departures in bulk
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
        </Link>
      </div>
    </div>
  );
}
