"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Navigation,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  X,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Route as RouteIcon,
} from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { RouteSchema } from "@/lib/adminValidations";

interface CityOption {
  id: string;
  name: string;
}

interface RouteStopItem {
  id?: string;
  cityId: string;
  cityName?: string;
  stopOrder: number;
  fareFromOrigin: number;
}

interface RouteItem {
  id: string;
  name: string;
  stopsCount: number;
  tripsCount: number;
  stops: RouteStopItem[];
  createdAt: string;
}

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState("");
  const [stopsList, setStopsList] = useState<RouteStopItem[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deletingRoute, setDeletingRoute] = useState<RouteItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      const [routesRes, citiesRes] = await Promise.all([
        fetch("/api/admin/routes"),
        fetch("/api/admin/cities"),
      ]);

      if (routesRes.ok && citiesRes.ok) {
        const routesData = await routesRes.json();
        const citiesData = await citiesRes.json();
        setRoutes(routesData.routes || []);
        setCities(citiesData.cities || []);
      }
    } catch {
      showToast("error", "Failed to load routes data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter & Pagination
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [routes, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / pageSize));
  const paginatedRoutes = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRoutes.slice(start, start + pageSize);
  }, [filteredRoutes, page, pageSize]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRouteId(null);
    setRouteName("");
    setStopsList([
      { cityId: cities[0]?.id || "", stopOrder: 1, fareFromOrigin: 0 },
      { cityId: cities[1]?.id || "", stopOrder: 2, fareFromOrigin: 1500 },
    ]);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (r: RouteItem) => {
    setEditingRouteId(r.id);
    setRouteName(r.name);
    setStopsList(
      r.stops.map((s, idx) => ({
        cityId: s.cityId,
        stopOrder: idx + 1,
        fareFromOrigin: s.fareFromOrigin,
      }))
    );
    setModalError(null);
    setIsModalOpen(true);
  };

  // Move Stop Up
  const moveStopUp = (index: number) => {
    if (index === 0) return;
    const updated = [...stopsList];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    // Re-index stopOrder
    updated.forEach((s, idx) => (s.stopOrder = idx + 1));
    setStopsList(updated);
  };

  // Move Stop Down
  const moveStopDown = (index: number) => {
    if (index === stopsList.length - 1) return;
    const updated = [...stopsList];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    updated.forEach((s, idx) => (s.stopOrder = idx + 1));
    setStopsList(updated);
  };

  // Add Stop
  const addStop = () => {
    const remainingCity = cities.find(
      (c) => !stopsList.some((s) => s.cityId === c.id)
    );
    const lastFare = stopsList[stopsList.length - 1]?.fareFromOrigin || 0;

    setStopsList([
      ...stopsList,
      {
        cityId: remainingCity?.id || cities[0]?.id || "",
        stopOrder: stopsList.length + 1,
        fareFromOrigin: lastFare + 500,
      },
    ]);
  };

  // Remove Stop
  const removeStop = (index: number) => {
    if (stopsList.length <= 2) {
      setModalError("A route must have at least 2 stops (Origin and Destination).");
      return;
    }
    const updated = stopsList.filter((_, idx) => idx !== index);
    updated.forEach((s, idx) => (s.stopOrder = idx + 1));
    setStopsList(updated);
  };

  // Update Stop Field
  const updateStop = (index: number, field: keyof RouteStopItem, val: any) => {
    const updated = [...stopsList];
    updated[index] = { ...updated[index], [field]: val };
    setStopsList(updated);
    setModalError(null);
  };

  // Save Route (Create / Edit)
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const payload = {
      name: routeName.trim(),
      stops: stopsList.map((s, idx) => ({
        cityId: s.cityId,
        stopOrder: idx + 1,
        fareFromOrigin: Number(s.fareFromOrigin) || 0,
      })),
    };

    const validation = RouteSchema.safeParse(payload);
    if (!validation.success) {
      setModalError(validation.error.errors[0]?.message || "Invalid route configuration");
      return;
    }

    setSaving(true);
    try {
      const url = editingRouteId ? `/api/admin/routes/${editingRouteId}` : "/api/admin/routes";
      const method = editingRouteId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to save route.");
      } else {
        showToast("success", data.message || "Route saved successfully.");
        setIsModalOpen(false);
        loadData();
      }
    } catch {
      setModalError("Network error while saving route.");
    } finally {
      setSaving(false);
    }
  };

  // Confirm Delete Route
  const handleConfirmDelete = async () => {
    if (!deletingRoute) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/routes/${deletingRoute.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Failed to delete route.");
      } else {
        showToast("success", data.message || "Route deleted successfully.");
        loadData();
      }
    } catch {
      showToast("error", "Network error while deleting route.");
    } finally {
      setDeleteLoading(false);
      setDeletingRoute(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Navigation className="w-4 h-4" />
            <span>Transit Corridors</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Routes &amp; Ordered Stops
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure intercity travel routes, ordered stations, and cumulative fares from origin.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Route</span>
        </button>
      </div>

      {/* Toast Notification */}
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

      {/* Search & Data Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        
        {/* Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search routes by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            Total Routes: <span className="font-bold text-white">{filteredRoutes.length}</span>
          </div>
        </div>

        {/* Routes Grid / Table */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading routes...</p>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No routes found matching &quot;{search}&quot;.
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedRoutes.map((route) => (
              <div
                key={route.id}
                className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-sky-400 flex items-center justify-center">
                      <RouteIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{route.name}</h3>
                      <p className="text-[11px] text-slate-400">{route.stopsCount} Stops • {route.tripsCount} Scheduled Trips</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(route)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Edit &amp; Reorder Stops</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingRoute(route)}
                      className="p-2 rounded-xl bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-900/50 transition-colors"
                      title="Delete Route"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ordered Stops Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {route.stops.map((s, idx) => (
                    <div key={s.id || idx} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                          {s.stopOrder}
                        </span>
                        <span className="font-semibold text-slate-200">{s.cityName}</span>
                        <span className="text-[10px] text-emerald-400 font-bold ml-1">
                          Rs. {s.fareFromOrigin}
                        </span>
                      </div>
                      {idx < route.stops.length - 1 && (
                        <span className="text-slate-600 font-bold">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
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

      {/* Create / Edit Route Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sky-400" />
                <span>{editingRouteId ? "Edit Route & Ordered Stops" : "Create New Route"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Route Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lahore - Multan - Karachi Express"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              {/* Ordered Stops List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ordered Stations ({stopsList.length})
                  </span>
                  <button
                    type="button"
                    onClick={addStop}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Intermediate Stop</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {stopsList.map((stop, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div className="font-semibold text-slate-400 text-[11px] w-14 shrink-0">
                          {idx === 0 ? "Origin" : idx === stopsList.length - 1 ? "Terminal" : `Stop ${idx + 1}`}
                        </div>

                        {/* City Select */}
                        <select
                          value={stop.cityId}
                          onChange={(e) => updateStop(idx, "cityId", e.target.value)}
                          className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-white focus:outline-none focus:border-sky-500 font-semibold"
                        >
                          {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Fare input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Fare from Origin (Rs):</span>
                          <input
                            type="number"
                            min={0}
                            value={stop.fareFromOrigin}
                            onChange={(e) => updateStop(idx, "fareFromOrigin", Number(e.target.value))}
                            className="w-20 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-emerald-400 font-bold text-right focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveStopUp(idx)}
                            disabled={idx === 0}
                            title="Move Up"
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStopDown(idx)}
                            disabled={idx === stopsList.length - 1}
                            title="Move Down"
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {stopsList.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeStop(idx)}
                              title="Remove Stop"
                              className="p-1 rounded-md bg-red-950/60 hover:bg-red-900 text-red-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Save Route & Stops"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingRoute}
        title={`Delete Route "${deletingRoute?.name}"?`}
        message={
          deletingRoute?.tripsCount && deletingRoute.tripsCount > 0
            ? `⚠️ Cannot delete: Route has ${deletingRoute.tripsCount} scheduled trip(s). You must remove or cancel those trips first.`
            : `Are you sure you want to permanently delete route "${deletingRoute?.name}" and all its stop segments?`
        }
        confirmText="Delete Route"
        isDestructive={true}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingRoute(null)}
      />

    </div>
  );
}
