"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Users, ArrowRightLeft, Search, AlertCircle } from "lucide-react";
import { z } from "zod";

const FormSchema = z.object({
  from: z.string().min(1, "Please select departure city"),
  to: z.string().min(1, "Please select destination city"),
  date: z.string().min(1, "Please select departure date"),
  passengers: z.number().int().min(1).max(4),
}).refine((data) => data.from !== data.to, {
  message: "Origin and destination cities cannot be the same",
  path: ["to"],
});

interface SearchFormProps {
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialPassengers?: number;
  compact?: boolean;
}

export default function SearchForm({
  initialFrom = "Lahore",
  initialTo = "Islamabad",
  initialDate,
  initialPassengers = 1,
  compact = false,
}: SearchFormProps) {
  const router = useRouter();

  // Default to today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate || todayStr);
  const [passengers, setPassengers] = useState(initialPassengers);
  const [cities, setCities] = useState<string[]>([
    "Lahore",
    "Islamabad",
    "Karachi",
    "Multan",
    "Peshawar",
    "Faisalabad",
    "Sargodha",
    "Sukkur",
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch live cities from API
    fetch("/api/cities")
      .then((res) => res.json())
      .then((data) => {
        if (data.cities && Array.isArray(data.cities)) {
          setCities(data.cities.map((c: { name: string }) => c.name));
        }
      })
      .catch(() => {});
  }, []);

  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = FormSchema.safeParse({
      from,
      to,
      date,
      passengers: Number(passengers),
    });

    if (!result.success) {
      setError(result.error.errors[0]?.message || "Invalid search inputs");
      return;
    }

    const params = new URLSearchParams({
      from,
      to,
      date,
      passengers: String(passengers),
    });

    router.push(`/trips?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full bg-slate-900/95 border border-blue-800/40 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-blue-950/50 backdrop-blur-xl ${
        compact ? "py-4" : ""
      }`}
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
        
        {/* From City */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Leaving From</span>
          </label>
          <div className="relative">
            <select
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setError(null);
              }}
              className="w-full appearance-none bg-slate-950/90 border border-slate-700 hover:border-slate-600 rounded-xl px-3.5 py-3 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {cities.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              ▼
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="md:col-span-1 flex justify-center pt-2 md:pt-5">
          <button
            type="button"
            onClick={handleSwap}
            aria-label="Swap origin and destination"
            className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:bg-blue-600 hover:border-blue-500 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-md group"
          >
            <ArrowRightLeft className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>

        {/* To City */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Going To</span>
          </label>
          <div className="relative">
            <select
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setError(null);
              }}
              className="w-full appearance-none bg-slate-950/90 border border-slate-700 hover:border-slate-600 rounded-xl px-3.5 py-3 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {cities.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              ▼
            </div>
          </div>
        </div>

        {/* Travel Date */}
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>Travel Date</span>
          </label>
          <input
            type="date"
            value={date}
            min={todayStr}
            onChange={(e) => {
              setDate(e.target.value);
              setError(null);
            }}
            className="w-full bg-slate-950/90 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            required
          />
        </div>

        {/* Passengers */}
        <div className="md:col-span-1">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Seats</span>
          </label>
          <select
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
            className="w-full bg-slate-950/90 border border-slate-700 hover:border-slate-600 rounded-xl px-2 py-3 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer text-center"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>

        {/* Search Submit Button */}
        <div className="md:col-span-2 pt-2 md:pt-5">
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/40 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all flex items-center justify-center gap-2 group"
          >
            <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Search Buses</span>
          </button>
        </div>

      </div>
    </form>
  );
}
