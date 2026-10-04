"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  BarChart3,
  TrendingUp,
  Download,
  Filter,
  DollarSign,
  Ticket,
  XCircle,
  Percent,
  RefreshCw,
  Navigation,
  Clock,
  Layers,
  FileSpreadsheet,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";

interface RouteOption {
  id: string;
  name: string;
}

interface RouteBreakdownItem {
  routeId: string;
  routeName: string;
  tripsCount: number;
  totalCapacity: number;
  ticketsSold: number;
  grossRevenue: number;
  cancellationsCount: number;
  refundedAmount: number;
  netRevenue: number;
  occupancyRate: number;
  averageFare: number;
}

interface TimeSeriesItem {
  period: string;
  periodLabel: string;
  revenue: number;
  ticketsSold: number;
  cancellations: number;
  bookingsCount: number;
  routesSales: Record<string, number>;
}

interface ReportData {
  filters: {
    startDate: string;
    endDate: string;
    groupBy: string;
    routeId: string;
  };
  summary: {
    totalRevenue: number;
    grossRevenue: number;
    totalTicketsSold: number;
    totalBookings: number;
    confirmedBookings: number;
    cancellationsCount: number;
    totalRefunds: number;
    averageTicketFare: number;
  };
  routeBreakdown: RouteBreakdownItem[];
  timeSeries: TimeSeriesItem[];
}

export default function AdminReportsPage() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Filters State
  const [preset, setPreset] = useState<"today" | "7days" | "30days" | "month" | "all">("30days");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [groupBy, setGroupBy] = useState<"day" | "week">("day");
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [exporting, setExporting] = useState(false);

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

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
        groupBy,
        routeId: routeFilter,
      });

      const res = await fetch(`/api/admin/reports?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      }
    } catch (err) {
      console.error("Failed to fetch report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, groupBy, routeFilter]);

  // Handle Preset Changes
  const applyPreset = (newPreset: "today" | "7days" | "30days" | "month" | "all") => {
    setPreset(newPreset);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (newPreset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (newPreset === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (newPreset === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (newPreset === "month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (newPreset === "all") {
      setStartDate("2026-01-01");
      setEndDate(todayStr);
    }
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    setExporting(true);
    const query = new URLSearchParams({
      startDate,
      endDate,
      groupBy,
      routeId: routeFilter,
      format: "csv",
    });

    const downloadUrl = `/api/admin/reports?${query.toString()}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `safar-express-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setExporting(false), 1500);
  };

  const summary = reportData?.summary;
  const routeBreakdown = reportData?.routeBreakdown || [];
  const timeSeries = reportData?.timeSeries || [];

  // Max revenue for time series chart scaling
  const maxSeriesRevenue = Math.max(...timeSeries.map((t) => t.revenue), 1000);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Business Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Sales, Revenue &amp; Route Performance Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Analyze daily/weekly sales volume across routes, monitor ticket cancellation refunds, and export executive CSV reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? "Generating CSV..." : "Export to CSV"}</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-400 mr-1">
              Time Preset:
            </span>
            {[
              { id: "today", label: "Today" },
              { id: "7days", label: "Last 7 Days" },
              { id: "30days", label: "Last 30 Days" },
              { id: "month", label: "This Month" },
              { id: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  preset === p.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-400">
              Group By:
            </span>
            <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGroupBy("day")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  groupBy === "day"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setGroupBy("week")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  groupBy === "week"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>

        {/* Date Inputs & Route Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset("30days");
              }}
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset("30days");
              }}
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Route Filter
            </label>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
            >
              <option value="ALL">All Route Corridors</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Net Revenue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Net Revenue
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-400">
                Rs. {summary.totalRevenue.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Gross: Rs. {summary.grossRevenue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Tickets Sold */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tickets Sold
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-950 text-sky-400 flex items-center justify-center border border-sky-800/60">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-sky-300">
                {summary.totalTicketsSold}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Across {summary.confirmedBookings} confirmed bookings
              </div>
            </div>
          </div>

          {/* Total Bookings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Bookings
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center border border-purple-800/60">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-purple-300">
                {summary.totalBookings}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {summary.confirmedBookings} active • {summary.cancellationsCount} cancelled
              </div>
            </div>
          </div>

          {/* Cancellations & Refunds */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Cancellations &amp; Refunds
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-950 text-red-400 flex items-center justify-center border border-red-800/60">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-red-300">
                {summary.cancellationsCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Rs. {summary.totalRefunds.toLocaleString()} refunded
              </div>
            </div>
          </div>

          {/* Average Ticket Value */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Avg Ticket Value
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-800/60">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-300">
                Rs. {summary.averageTicketFare.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Net average passenger fare
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales per Route Performance Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Sales &amp; Occupancy Performance per Route
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Corridor revenue contribution, scheduled trips, tickets sold, and capacity occupancy rates
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Calculating route analytics...</p>
          </div>
        ) : routeBreakdown.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No route sales recorded for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Route Name</th>
                  <th className="py-3 px-4">Trips Run</th>
                  <th className="py-3 px-4">Tickets Sold</th>
                  <th className="py-3 px-4">Occupancy %</th>
                  <th className="py-3 px-4">Gross Sales</th>
                  <th className="py-3 px-4">Cancellations</th>
                  <th className="py-3 px-4">Net Revenue</th>
                  <th className="py-3 px-4 text-right">Avg Fare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {routeBreakdown.map((r) => {
                  return (
                    <tr
                      key={r.routeId}
                      className="hover:bg-slate-950/40 transition-colors"
                    >
                      {/* Route Name */}
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {r.routeName}
                      </td>

                      {/* Trips */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                        {r.tripsCount} trips
                      </td>

                      {/* Tickets Sold */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-sky-400 text-sm">
                          {r.ticketsSold}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {" "}
                          / {r.totalCapacity} cap
                        </span>
                      </td>

                      {/* Occupancy Rate */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span
                            className={
                              r.occupancyRate >= 70
                                ? "text-emerald-400"
                                : r.occupancyRate >= 40
                                ? "text-amber-400"
                                : "text-slate-400"
                            }
                          >
                            {r.occupancyRate}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full"
                            style={{
                              width: `${Math.min(100, r.occupancyRate)}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Gross Revenue */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        Rs. {r.grossRevenue.toLocaleString()}
                      </td>

                      {/* Cancellations */}
                      <td className="py-3.5 px-4">
                        <span className="text-red-300 font-bold">
                          {r.cancellationsCount}
                        </span>
                        {r.refundedAmount > 0 && (
                          <div className="text-[10px] text-slate-500">
                            (Rs. {r.refundedAmount.toLocaleString()})
                          </div>
                        )}
                      </td>

                      {/* Net Revenue */}
                      <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">
                        Rs. {r.netRevenue.toLocaleString()}
                      </td>

                      {/* Avg Fare */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                        Rs. {r.averageFare.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Time Series Sales Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Time Series Trend Breakdown ({groupBy.toUpperCase()})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological breakdown of sales, passenger tickets, and cancellations
            </p>
          </div>
        </div>

        {timeSeries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No time series data available for the chosen range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Net Revenue</th>
                  <th className="py-3 px-4">Tickets Sold</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Cancellations</th>
                  <th className="py-3 px-4">Revenue Proportional Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {timeSeries.map((ts) => {
                  const barWidth =
                    maxSeriesRevenue > 0
                      ? Math.round((ts.revenue / maxSeriesRevenue) * 100)
                      : 0;

                  return (
                    <tr
                      key={ts.period}
                      className="hover:bg-slate-950/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-white text-xs">
                        {ts.periodLabel}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">
                        Rs. {ts.revenue.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-sky-300">
                        {ts.ticketsSold} tickets
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {ts.bookingsCount} orders
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold ${
                            ts.cancellations > 0
                              ? "text-red-300"
                              : "text-slate-500"
                          }`}
                        >
                          {ts.cancellations}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(2, barWidth)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
