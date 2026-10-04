"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Bus, 
  Clock, 
  MapPin, 
  Calendar, 
  Users, 
  ArrowRight, 
  SlidersHorizontal, 
  ChevronRight,
  Filter, 
  Sparkles, 
  AlertCircle,
  Armchair,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import SearchForm from "@/components/SearchForm";

interface TripResult {
  id: string;
  routeId: string;
  routeName: string;
  direction: "FORWARD" | "REVERSE";
  originCity: { id: string; name: string; stopId: string; stopOrder: number };
  destinationCity: { id: string; name: string; stopId: string; stopOrder: number };
  departureTime: string;
  estimatedArrival: string;
  durationFormatted: string;
  durationMinutes: number;
  fare: number;
  bus: {
    id: string;
    number: string;
    type: "BUSINESS" | "EXECUTIVE";
    layout: string;
    totalSeats: number;
  };
  availableSeats: number;
  occupiedSeatCount: number;
  status: string;
}

function TripsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const from = searchParams.get("from") || "Lahore";
  const to = searchParams.get("to") || "Islamabad";
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const passengers = Number(searchParams.get("passengers") || "1");

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedBusType, setSelectedBusType] = useState<string>("ALL");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("DEPARTURE_ASC");
  const [showModifySearch, setShowModifySearch] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      from,
      to,
      date,
    });

    fetch(`/api/trips/search?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || "Failed to search trips");
          });
        }
        return res.json();
      })
      .then((data) => {
        setTrips(data.trips || []);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setTrips([]);
        setLoading(false);
      });
  }, [from, to, date]);

  // Quick Date Navigation
  const handleDateChange = (offsetDays: number) => {
    const current = new Date(date);
    current.setDate(current.getDate() + offsetDays);
    const newDateStr = current.toISOString().split("T")[0];

    const params = new URLSearchParams({
      from,
      to,
      date: newDateStr,
      passengers: String(passengers),
    });
    router.push(`/trips?${params.toString()}`);
  };

  // Filter & Sort Logic
  const filteredAndSortedTrips = useMemo(() => {
    let result = [...trips];

    // Filter by Bus Type
    if (selectedBusType !== "ALL") {
      result = result.filter((t) => t.bus.type === selectedBusType);
    }

    // Filter by Time of Day (Local hour)
    if (selectedTimeSlot !== "ALL") {
      result = result.filter((t) => {
        const depHour = new Date(t.departureTime).getUTCHours();
        if (selectedTimeSlot === "MORNING") return depHour >= 6 && depHour < 12;
        if (selectedTimeSlot === "AFTERNOON") return depHour >= 12 && depHour < 18;
        if (selectedTimeSlot === "EVENING") return depHour >= 18 && depHour < 24;
        if (selectedTimeSlot === "NIGHT") return depHour >= 0 && depHour < 6;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "PRICE_ASC") return a.fare - b.fare;
      if (sortBy === "PRICE_DESC") return b.fare - a.fare;
      if (sortBy === "DEPARTURE_ASC") {
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
      }
      if (sortBy === "DEPARTURE_DESC") {
        return new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime();
      }
      if (sortBy === "DURATION") return a.durationMinutes - b.durationMinutes;
      return 0;
    });

    return result;
  }, [trips, selectedBusType, selectedTimeSlot, sortBy]);

  const formattedDate = new Date(date).toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Search Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 border border-blue-800/40 rounded-3xl p-5 sm:p-7 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
                <span>Trip Search Results</span>
                <span>•</span>
                <span className="text-slate-300">{passengers} Passenger(s)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                <span>{from}</span>
                <ArrowRight className="w-5 h-5 text-sky-400" />
                <span>{to}</span>
              </h1>
              <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>{formattedDate}</span>
              </p>
            </div>

            {/* Quick Actions & Modify Button */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => handleDateChange(-1)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              >
                ← Previous Day
              </button>
              <button
                onClick={() => handleDateChange(1)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              >
                Next Day →
              </button>
              <button
                onClick={() => setShowModifySearch(!showModifySearch)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showModifySearch ? "Close Form" : "Modify Search"}</span>
              </button>
            </div>
          </div>

          {/* Expandable Modify Search Form */}
          {showModifySearch && (
            <div className="mt-5 pt-5 border-t border-slate-800 animate-in fade-in">
              <SearchForm
                initialFrom={from}
                initialTo={to}
                initialDate={date}
                initialPassengers={passengers}
                compact
              />
            </div>
          )}
        </div>

        {/* Filters & Sorting Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Filter Options */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              <span>Filters:</span>
            </span>

            {/* Bus Type Filter */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setSelectedBusType("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedBusType === "ALL"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Buses
              </button>
              <button
                onClick={() => setSelectedBusType("BUSINESS")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedBusType === "BUSINESS"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Business (2x1)
              </button>
              <button
                onClick={() => setSelectedBusType("EXECUTIVE")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedBusType === "EXECUTIVE"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Executive (2x2)
              </button>
            </div>

            {/* Departure Slot Filter */}
            <select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Departure Times</option>
              <option value="MORNING">Morning (06:00 - 12:00)</option>
              <option value="AFTERNOON">Afternoon (12:00 - 18:00)</option>
              <option value="EVENING">Evening (18:00 - 24:00)</option>
              <option value="NIGHT">Night (00:00 - 06:00)</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="DEPARTURE_ASC">Earliest Departure</option>
              <option value="DEPARTURE_DESC">Latest Departure</option>
              <option value="PRICE_ASC">Cheapest Fare</option>
              <option value="PRICE_DESC">Highest Fare</option>
              <option value="DURATION">Shortest Duration</option>
            </select>
          </div>

        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-lg font-bold text-white">Searching Available Buses...</div>
            <p className="text-xs text-slate-400">
              Checking schedules, live seats, and route segment availability for {from} to {to}
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-800 rounded-3xl p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-lg font-bold text-red-200">Unable to Fetch Trips</h2>
            <p className="text-xs text-red-300 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 mt-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Search</span>
            </button>
          </div>
        ) : filteredAndSortedTrips.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-10 sm:p-14 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center mx-auto text-sky-400 mb-2">
              <Bus className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">No Scheduled Buses Found</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              We couldn&apos;t find departures for <span className="text-white font-semibold">{from} to {to}</span> on {formattedDate} matching your filters.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleDateChange(1)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all"
              >
                Search Next Day ({new Date(new Date(date).getTime() + 86400000).toLocaleDateString("en-PK", { month: "short", day: "numeric" })})
              </button>
              
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
              >
                View Popular Routes
              </Link>
            </div>
          </div>
        ) : (
          /* Trip Results List */
          <div className="space-y-4">
            <div className="text-xs text-slate-400 font-medium px-1">
              Showing <span className="text-white font-bold">{filteredAndSortedTrips.length}</span> bus departures
            </div>

            {filteredAndSortedTrips.map((trip) => {
              const depDate = new Date(trip.departureTime);
              const arrDate = new Date(trip.estimatedArrival);

              const formattedDepTime = depDate.toLocaleTimeString("en-PK", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              const formattedArrTime = arrDate.toLocaleTimeString("en-PK", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              const isBusiness = trip.bus.type === "BUSINESS";
              const isSeatsLow = trip.availableSeats <= 5;

              return (
                <div
                  key={trip.id}
                  className="bg-slate-900/95 border border-slate-800 hover:border-blue-700/60 rounded-3xl p-5 sm:p-6 shadow-xl shadow-blue-950/20 hover:shadow-2xl hover:shadow-blue-900/30 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group"
                >
                  {/* Left Column: Operator & Bus Info */}
                  <div className="lg:w-1/4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          isBusiness
                            ? "bg-amber-950/80 text-amber-300 border-amber-800/80"
                            : "bg-blue-950/80 text-sky-300 border-blue-800/80"
                        }`}
                      >
                        {trip.bus.type}
                      </span>
                      <span className="text-xs text-slate-400 font-medium bg-slate-800/80 px-2 py-0.5 rounded-md">
                        {trip.bus.layout} Seating
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-white group-hover:text-sky-400 transition-colors">
                      {trip.bus.number}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{trip.routeName}</p>

                    <div className="mt-3 flex items-center gap-1.5 text-xs">
                      <Armchair className={`w-3.5 h-3.5 ${isSeatsLow ? "text-amber-400" : "text-emerald-400"}`} />
                      <span className={`font-bold ${isSeatsLow ? "text-amber-400" : "text-emerald-400"}`}>
                        {trip.availableSeats} {trip.availableSeats === 1 ? "seat" : "seats"} left
                      </span>
                      <span className="text-slate-500">/ {trip.bus.totalSeats}</span>
                    </div>
                  </div>

                  {/* Middle Column: Schedule & Journey Timeline */}
                  <div className="lg:w-2/4 flex items-center justify-between gap-4 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x border-slate-800/80 lg:px-6">
                    
                    {/* Departure Point */}
                    <div className="text-left">
                      <div className="text-xl sm:text-2xl font-black text-white">
                        {formattedDepTime}
                      </div>
                      <div className="text-xs font-bold text-sky-300 mt-0.5">
                        {trip.originCity.name}
                      </div>
                      <div className="text-[11px] text-slate-400">Boarding Point</div>
                    </div>

                    {/* Duration / Arrow Bar */}
                    <div className="flex flex-col items-center px-2">
                      <span className="text-[11px] font-semibold text-purple-300 bg-purple-950/80 border border-purple-800/80 px-2.5 py-0.5 rounded-full mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{trip.durationFormatted}</span>
                      </span>
                      <div className="w-24 sm:w-32 h-0.5 bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-slate-900" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-slate-900" />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                        {trip.direction === "FORWARD" ? "Direct Express" : "Return Express"}
                      </span>
                    </div>

                    {/* Arrival Point */}
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-black text-white">
                        {formattedArrTime}
                      </div>
                      <div className="text-xs font-bold text-emerald-300 mt-0.5">
                        {trip.destinationCity.name}
                      </div>
                      <div className="text-[11px] text-slate-400">Destination</div>
                    </div>

                  </div>

                  {/* Right Column: Fare & Booking Action */}
                  <div className="lg:w-1/4 flex lg:flex-col items-center lg:items-end justify-between gap-3">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                        Ticket Fare
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                        Rs. {trip.fare.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">per passenger</span>
                    </div>

                    <Link
                      href={`/trips/${trip.id}/seats?from=${encodeURIComponent(
                        trip.originCity.name
                      )}&to=${encodeURIComponent(trip.destinationCity.name)}&passengers=${passengers}`}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 group-hover:translate-x-1"
                    >
                      <span>Select Seats</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Search Results...</div>}>
      <TripsContent />
    </Suspense>
  );
}
