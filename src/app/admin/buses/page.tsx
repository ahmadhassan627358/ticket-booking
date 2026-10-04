"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Bus,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Armchair,
} from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { BusSchema } from "@/lib/adminValidations";

interface BusItem {
  id: string;
  number: string;
  type: "BUSINESS" | "EXECUTIVE";
  layout: "2x1" | "2x2";
  totalSeats: number;
  tripsCount: number;
  createdAt: string;
}

export default function AdminBusesPage() {
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [busNumber, setBusNumber] = useState("");
  const [busType, setBusType] = useState<"BUSINESS" | "EXECUTIVE">("BUSINESS");
  const [busLayout, setBusLayout] = useState<"2x1" | "2x2">("2x1");
  const [totalSeats, setTotalSeats] = useState(33);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deletingBus, setDeletingBus] = useState<BusItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBuses = async () => {
    try {
      const res = await fetch("/api/admin/buses");
      if (res.ok) {
        const data = await res.json();
        setBuses(data.buses || []);
      }
    } catch {
      showToast("error", "Failed to load bus fleet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  // Filter & Pagination
  const filteredBuses = useMemo(() => {
    return buses.filter(
      (b) =>
        b.number.toLowerCase().includes(search.toLowerCase().trim()) ||
        b.type.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [buses, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBuses.length / pageSize));
  const paginatedBuses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBuses.slice(start, start + pageSize);
  }, [filteredBuses, page, pageSize]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBusId(null);
    setBusNumber("");
    setBusType("BUSINESS");
    setBusLayout("2x1");
    setTotalSeats(33);
    setModalError(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (b: BusItem) => {
    setEditingBusId(b.id);
    setBusNumber(b.number);
    setBusType(b.type);
    setBusLayout(b.layout);
    setTotalSeats(b.totalSeats);
    setModalError(null);
    setShowModal(true);
  };

  // Adjust default seats when layout changes
  const handleLayoutChange = (layout: "2x1" | "2x2") => {
    setBusLayout(layout);
    if (layout === "2x1" && totalSeats === 44) {
      setTotalSeats(33);
      setBusType("BUSINESS");
    } else if (layout === "2x2" && totalSeats === 33) {
      setTotalSeats(44);
      setBusType("EXECUTIVE");
    }
  };

  // Save Bus (Add / Update)
  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const payload = {
      number: busNumber.trim().toUpperCase(),
      type: busType,
      layout: busLayout,
      totalSeats: Number(totalSeats),
    };

    const validation = BusSchema.safeParse(payload);
    if (!validation.success) {
      setModalError(validation.error.errors[0]?.message || "Invalid bus details");
      return;
    }

    setSaving(true);
    try {
      const url = editingBusId ? `/api/admin/buses/${editingBusId}` : "/api/admin/buses";
      const method = editingBusId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to save bus.");
      } else {
        showToast("success", data.message || "Bus saved successfully.");
        setShowModal(false);
        fetchBuses();
      }
    } catch {
      setModalError("Network error while saving bus.");
    } finally {
      setSaving(false);
    }
  };

  // Confirm Delete Bus
  const handleConfirmDelete = async () => {
    if (!deletingBus) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/buses/${deletingBus.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Failed to delete bus.");
      } else {
        showToast("success", data.message || "Bus deleted successfully.");
        fetchBuses();
      }
    } catch {
      showToast("error", "Network error while deleting bus.");
    } finally {
      setDeleteLoading(false);
      setDeletingBus(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Bus className="w-4 h-4" />
            <span>Fleet Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Bus Fleet Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Register and manage luxury coaches, cabin seating layouts, and capacity specifications.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Bus</span>
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

      {/* Search & Fleet Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        
        {/* Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by bus number or type..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            Total Fleet: <span className="font-bold text-white">{filteredBuses.length} Buses</span>
          </div>
        </div>

        {/* Fleet Table */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading fleet inventory...</p>
          </div>
        ) : filteredBuses.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No buses found matching &quot;{search}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Registration #</th>
                  <th className="py-3 px-4">Class &amp; Type</th>
                  <th className="py-3 px-4">Cabin Seating Layout</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Trips Scheduled</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedBuses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white text-sm font-mono">
                      {bus.number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        bus.type === "BUSINESS"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-blue-950 text-sky-300 border border-blue-800"
                      }`}>
                        {bus.type} Class
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-200">
                        {bus.layout} ({bus.layout === "2x1" ? "VIP Single/Double" : "Standard Double"})
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                        <Armchair className="w-3.5 h-3.5 text-sky-400" />
                        <span>{bus.totalSeats} Seats</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>{bus.tripsCount} Trip(s)</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(bus)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Edit Bus Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingBus(bus)}
                        className="p-2 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-900/50 transition-colors"
                        title="Delete Bus"
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

      {/* Add / Edit Bus Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bus className="w-4 h-4 text-sky-400" />
                <span>{editingBusId ? "Edit Coach Specifications" : "Register Coach to Fleet"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleSaveBus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bus Registration Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BUS-107 (Daewoo Royal)"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 font-mono uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Class Category
                  </label>
                  <select
                    value={busType}
                    onChange={(e) => setBusType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 font-semibold"
                  >
                    <option value="BUSINESS">BUSINESS (VIP)</option>
                    <option value="EXECUTIVE">EXECUTIVE (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Cabin Layout
                  </label>
                  <select
                    value={busLayout}
                    onChange={(e) => handleLayoutChange(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 font-semibold font-mono"
                  >
                    <option value="2x1">2x1 (3 Seats / Row)</option>
                    <option value="2x2">2x2 (4 Seats / Row)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Total Passenger Capacity <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Typical: 33 seats for 2x1 Business, 44 seats for 2x2 Executive
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                    "Save Coach"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingBus}
        title={`Delete Bus "${deletingBus?.number}"?`}
        message={
          deletingBus?.tripsCount && deletingBus.tripsCount > 0
            ? `⚠️ Cannot delete: Coach "${deletingBus.number}" has ${deletingBus.tripsCount} scheduled trip(s). Reassign or cancel those trips first.`
            : `Are you sure you want to permanently remove coach "${deletingBus?.number}" from the fleet?`
        }
        confirmText="Delete Coach"
        isDestructive={true}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingBus(null)}
      />

    </div>
  );
}
