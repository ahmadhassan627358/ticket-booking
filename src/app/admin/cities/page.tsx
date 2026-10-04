"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Navigation,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { CitySchema } from "@/lib/adminValidations";

interface CityItem {
  id: string;
  name: string;
  routesCount: number;
  createdAt: string;
}

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [cityNameInput, setCityNameInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit State
  const [editingCity, setEditingCity] = useState<CityItem | null>(null);
  const [editNameInput, setEditNameInput] = useState("");

  // Delete State
  const [deletingCity, setDeletingCity] = useState<CityItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCities = async () => {
    try {
      const res = await fetch("/api/admin/cities");
      if (res.ok) {
        const data = await res.json();
        setCities(data.cities || []);
      }
    } catch {
      showToast("error", "Failed to load cities from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  // Filter & Pagination
  const filteredCities = useMemo(() => {
    return cities.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [cities, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCities.length / pageSize));
  const paginatedCities = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCities.slice(start, start + pageSize);
  }, [filteredCities, page, pageSize]);

  // Handle Add City
  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const validation = CitySchema.safeParse({ name: cityNameInput });
    if (!validation.success) {
      setModalError(validation.error.errors[0]?.message || "Invalid city name");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cityNameInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to add city.");
      } else {
        showToast("success", data.message || "City added successfully.");
        setShowAddModal(false);
        setCityNameInput("");
        fetchCities();
      }
    } catch {
      setModalError("Network error while adding city.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit City
  const handleEditCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity) return;
    setModalError(null);

    const validation = CitySchema.safeParse({ name: editNameInput });
    if (!validation.success) {
      setModalError(validation.error.errors[0]?.message || "Invalid city name");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cities/${editingCity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editNameInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to update city.");
      } else {
        showToast("success", data.message || "City updated successfully.");
        setEditingCity(null);
        fetchCities();
      }
    } catch {
      setModalError("Network error while updating city.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete City
  const handleConfirmDelete = async () => {
    if (!deletingCity) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/cities/${deletingCity.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Failed to delete city.");
      } else {
        showToast("success", data.message || "City deleted successfully.");
        fetchCities();
      }
    } catch {
      showToast("error", "Network error while deleting city.");
    } finally {
      setDeleteLoading(false);
      setDeletingCity(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <MapPin className="w-4 h-4" />
            <span>Master Data</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            City Terminals Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage origin and destination transit stations across Pakistan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            setCityNameInput("");
            setModalError(null);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New City</span>
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
        
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search cities by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            Total Cities: <span className="font-bold text-white">{filteredCities.length}</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading cities...</p>
          </div>
        ) : filteredCities.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No cities found matching &quot;{search}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">City Name</th>
                  <th className="py-3 px-4">Active Route Stops</th>
                  <th className="py-3 px-4">Added Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedCities.map((city, idx) => (
                  <tr key={city.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {city.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        city.routesCount > 0
                          ? "bg-blue-950 text-sky-300 border border-blue-800"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        <Navigation className="w-3 h-3" />
                        <span>{city.routesCount} Route Stop(s)</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(city.createdAt).toLocaleDateString("en-PK")}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCity(city);
                          setEditNameInput(city.name);
                          setModalError(null);
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Edit City"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingCity(city)}
                        className="p-2 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-900/50 transition-colors"
                        title="Delete City"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Add City Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>Add New Transit City</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleAddCity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  City Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sialkot, Quetta, Gujranwala"
                  value={cityNameInput}
                  onChange={(e) => setCityNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                    "Save City"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit City Modal */}
      {editingCity && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <span>Rename City Terminal</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCity(null)}
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

            <form onSubmit={handleEditCity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  City Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCity(null)}
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
                    "Update City"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingCity}
        title={`Delete City "${deletingCity?.name}"?`}
        message={
          deletingCity?.routesCount && deletingCity.routesCount > 0
            ? `⚠️ Cannot delete: This city is assigned to ${deletingCity.routesCount} active route stop(s). You must remove it from routes before deleting.`
            : `Are you sure you want to permanently delete city "${deletingCity?.name}" from the system?`
        }
        confirmText="Delete City"
        isDestructive={true}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCity(null)}
      />

    </div>
  );
}
