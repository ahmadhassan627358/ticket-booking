"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Bus, 
  Clock, 
  MapPin, 
  Calendar, 
  Users, 
  ArrowRight, 
  AlertCircle,
  Armchair,
  CheckCircle2,
  Lock,
  Timer,
  ChevronRight,
  ShieldCheck,
  User,
  HeartHandshake
} from "lucide-react";
import { getAdjacentSeatNo } from "@/lib/busLayout";

interface SeatState {
  seatNo: number;
  status: "AVAILABLE" | "BOOKED_MALE" | "BOOKED_FEMALE" | "LOCKED_BY_OTHER" | "LOCKED_BY_ME";
  passengerGender?: "MALE" | "FEMALE";
  lockedUntil?: string;
  adjacentSeatNo: number | null;
  genderRestriction?: "FEMALE_ONLY" | null;
}

interface TripDetails {
  id: string;
  routeId: string;
  routeName: string;
  direction: "FORWARD" | "REVERSE";
  departureTime: string;
  fare: number;
  fromStop: { id: string; cityId: string; cityName: string; stopOrder: number };
  toStop: { id: string; cityId: string; cityName: string; stopOrder: number };
  bus: { id: string; number: string; type: "BUSINESS" | "EXECUTIVE"; layout: string; totalSeats: number };
}

interface SelectedSeat {
  seatNo: number;
  gender: "MALE" | "FEMALE";
}

function SeatSelectionContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tripId = params.tripId as string;
  const fromCity = searchParams.get("from") || "";
  const toCity = searchParams.get("to") || "";
  const maxPassengers = Number(searchParams.get("passengers") || "1");

  // Client Session ID for locking seats
  const [sessionId, setSessionId] = useState<string>("");
  useEffect(() => {
    let sid = sessionStorage.getItem("safar_session_id");
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("safar_session_id", sid);
    }
    setSessionId(sid);
  }, []);

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [seats, setSeats] = useState<SeatState[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Gender Selection Modal State
  const [genderModalSeat, setGenderModalSeat] = useState<SeatState | null>(null);

  // Fetch Seat Map
  const fetchSeatData = useCallback(() => {
    if (!tripId || !sessionId) return;

    fetch(`/api/trips/${tripId}/seats?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&sessionId=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.trip && data.seatMap) {
          setTrip(data.trip);
          setSeats(data.seatMap);

          // Restore any seats already locked by this session
          const previouslyLocked = data.seatMap
            .filter((s: SeatState) => s.status === "LOCKED_BY_ME")
            .map((s: SeatState) => ({
              seatNo: s.seatNo,
              gender: s.passengerGender || "MALE",
            }));

          if (previouslyLocked.length > 0 && selectedSeats.length === 0) {
            setSelectedSeats(previouslyLocked);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching seat map:", err);
        setLoading(false);
      });
  }, [tripId, fromCity, toCity, sessionId, selectedSeats.length]);

  useEffect(() => {
    if (sessionId) {
      fetchSeatData();
    }
  }, [sessionId, fetchSeatData]);

  // Lock Seats in Database
  const lockSeatsOnServer = async (newSelected: SelectedSeat[]) => {
    if (!trip || newSelected.length === 0) {
      setTimeRemaining(null);
      // Unlock all
      if (sessionId) {
        fetch("/api/seats/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId: trip?.id, sessionId }),
        }).catch(() => {});
      }
      return;
    }

    setLocking(true);
    setLockError(null);

    try {
      const res = await fetch("/api/seats/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id,
          fromStopId: trip.fromStop.id,
          toStopId: trip.toStop.id,
          sessionId,
          seats: newSelected,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLockError(data.error || "Failed to reserve seat. It may have just been booked.");
        fetchSeatData();
      } else {
        setTimeRemaining(data.secondsRemaining || 600);
      }
    } catch (err: unknown) {
      setLockError("Connection error while securing seat hold.");
    } finally {
      setLocking(false);
    }
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setLockError("Your seat reservation hold expired. Please re-select your seats.");
          setSelectedSeats([]);
          fetchSeatData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, fetchSeatData]);

  // Format Timer mm:ss
  const formattedTimer = useMemo(() => {
    if (timeRemaining === null) return null;
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  }, [timeRemaining]);

  // Click on a Seat
  const handleSeatClick = (seat: SeatState) => {
    setLockError(null);

    // If seat is already selected by me -> deselect it
    const isSelected = selectedSeats.some((s) => s.seatNo === seat.seatNo);
    if (isSelected) {
      const updated = selectedSeats.filter((s) => s.seatNo !== seat.seatNo);
      setSelectedSeats(updated);
      lockSeatsOnServer(updated);
      return;
    }

    // If booked or locked by another user -> do nothing
    if (seat.status !== "AVAILABLE" && seat.status !== "LOCKED_BY_ME") {
      return;
    }

    // Check passenger limit
    if (selectedSeats.length >= maxPassengers) {
      setLockError(`You selected ${maxPassengers} passenger(s). To pick a different seat, unselect one first.`);
      return;
    }

    // If seat has a female-only restriction from adjacent passenger
    if (seat.genderRestriction === "FEMALE_ONLY") {
      // Auto-assign female or prompt
      confirmSeatGender(seat, "FEMALE");
      return;
    }

    // Open gender prompt modal
    setGenderModalSeat(seat);
  };

  const confirmSeatGender = (seat: SeatState, gender: "MALE" | "FEMALE") => {
    // Enforce Gender Rule on Client:
    if (gender === "MALE" && seat.adjacentSeatNo) {
      // Check if adjacent seat is booked by female in existing bookings
      const adjSeat = seats.find((s) => s.seatNo === seat.adjacentSeatNo);
      if (adjSeat && adjSeat.status === "BOOKED_FEMALE") {
        setLockError(`Seat ${seat.seatNo} is next to a female passenger and can only be booked by a female.`);
        setGenderModalSeat(null);
        return;
      }
    }

    const updated = [...selectedSeats, { seatNo: seat.seatNo, gender }];
    setSelectedSeats(updated);
    setGenderModalSeat(null);
    lockSeatsOnServer(updated);
  };

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0 || !trip) return;
    
    // Pass selected seats and metadata to checkout
    const seatsParam = JSON.stringify(selectedSeats);
    const query = new URLSearchParams({
      tripId: trip.id,
      fromStopId: trip.fromStop.id,
      toStopId: trip.toStop.id,
      fromCity: trip.fromStop.cityName,
      toCity: trip.toStop.cityName,
      seats: seatsParam,
      sessionId,
    });

    router.push(`/booking/checkout?${query.toString()}`);
  };

  const totalFare = trip ? trip.fare * selectedSeats.length : 0;
  const is2x1 = trip?.bus.layout === "2x1";

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumbs & Trip Summary */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 border border-blue-800/40 rounded-3xl p-5 sm:p-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
                <span>Step 2 of 3</span>
                <span>•</span>
                <span>Seat Layout Selection</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                <span>{fromCity || trip?.fromStop.cityName}</span>
                <ArrowRight className="w-5 h-5 text-sky-400" />
                <span>{toCity || trip?.toStop.cityName}</span>
              </h1>
              {trip && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-semibold text-white">{trip.bus.number}</span> ({trip.bus.type} • {trip.bus.layout})
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>{new Date(trip.departureTime).toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" })}</span>
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">
                    Rs. {trip.fare.toLocaleString()} per seat
                  </span>
                </div>
              )}
            </div>

            {/* Countdown Hold Timer */}
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="flex items-center gap-3 bg-amber-950/80 border border-amber-600/80 px-4 py-2.5 rounded-2xl animate-pulse">
                <Timer className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">Seats Locked For</div>
                  <div className="text-lg font-black text-white font-mono">{formattedTimer}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {lockError && (
          <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-sm flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">{lockError}</div>
          </div>
        )}

        {loading ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-16 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-lg font-bold text-white">Loading Bus Seat Grid...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Seat Map Card (8 Columns) */}
            <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl">
              
              {/* Legend Bar */}
              <div className="pb-6 border-b border-slate-800 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500 shadow-sm shadow-emerald-500/30" />
                  <span className="text-slate-200">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-amber-500 ring-2 ring-amber-300 shadow-sm shadow-amber-500/30" />
                  <span className="text-slate-200">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-blue-600 shadow-sm shadow-blue-600/30" />
                  <span className="text-slate-200">Booked (Male)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-pink-500 shadow-sm shadow-pink-500/30" />
                  <span className="text-slate-200">Booked (Female)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-slate-700" />
                  <span className="text-slate-400">Locked</span>
                </div>
              </div>

              {/* Bus Cabin Container */}
              <div className="mt-8 max-w-sm mx-auto bg-slate-950 border-2 border-slate-800 rounded-[2.5rem] p-5 shadow-2xl relative">
                
                {/* Front Windshield & Driver Cabin */}
                <div className="pb-6 mb-6 border-b-2 border-dashed border-slate-800 flex items-center justify-between px-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Front / Entry</span>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <span className="text-xs font-bold text-slate-400">Driver Cabin</span>
                    <span className="text-lg">🛞</span>
                  </div>
                </div>

                {/* Rows Grid */}
                <div className="space-y-3">
                  {Array.from({ length: Math.ceil((trip?.bus.totalSeats || 44) / (is2x1 ? 3 : 4)) }, (_, rIdx) => {
                    const rowNum = rIdx + 1;
                    const seatsPerRow = is2x1 ? 3 : 4;
                    
                    // Seats for this row
                    const s1Num = rIdx * seatsPerRow + 1;
                    const s2Num = rIdx * seatsPerRow + 2;
                    const s3Num = rIdx * seatsPerRow + 3;
                    const s4Num = rIdx * seatsPerRow + 4;

                    const s1 = seats.find((s) => s.seatNo === s1Num);
                    const s2 = seats.find((s) => s.seatNo === s2Num);
                    const s3 = seats.find((s) => s.seatNo === s3Num);
                    const s4 = !is2x1 ? seats.find((s) => s.seatNo === s4Num) : null;

                    const renderSeatButton = (seatObj?: SeatState | null) => {
                      if (!seatObj) return <div className="w-10 h-10" />;

                      const isSelected = selectedSeats.some((s) => s.seatNo === seatObj.seatNo);
                      const selectedObj = selectedSeats.find((s) => s.seatNo === seatObj.seatNo);
                      const isAvailable = seatObj.status === "AVAILABLE" || seatObj.status === "LOCKED_BY_ME";
                      const isFemaleRestricted = seatObj.genderRestriction === "FEMALE_ONLY";

                      let bgClass = "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer shadow-md shadow-emerald-500/20";
                      let label = String(seatObj.seatNo);

                      if (isSelected) {
                        bgClass = "bg-amber-500 text-slate-950 font-black ring-4 ring-amber-300 shadow-lg shadow-amber-500/40 cursor-pointer animate-scale";
                      } else if (seatObj.status === "BOOKED_MALE") {
                        bgClass = "bg-blue-600 text-white font-bold cursor-not-allowed opacity-80";
                      } else if (seatObj.status === "BOOKED_FEMALE") {
                        bgClass = "bg-pink-500 text-white font-bold cursor-not-allowed opacity-80";
                      } else if (seatObj.status === "LOCKED_BY_OTHER") {
                        bgClass = "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60";
                      } else if (isFemaleRestricted) {
                        bgClass = "bg-emerald-600/90 text-white border border-pink-400 font-bold hover:bg-pink-600";
                      }

                      return (
                        <button
                          key={seatObj.seatNo}
                          type="button"
                          onClick={() => handleSeatClick(seatObj)}
                          disabled={!isAvailable && !isSelected}
                          title={
                            isSelected
                              ? `Seat ${seatObj.seatNo} (${selectedObj?.gender}) - Click to remove`
                              : isFemaleRestricted
                              ? `Seat ${seatObj.seatNo} (Adjacent to female - Female passengers only)`
                              : `Seat ${seatObj.seatNo} - ${seatObj.status}`
                          }
                          className={`w-10 h-11 rounded-xl flex flex-col items-center justify-center text-xs transition-all duration-200 relative group ${bgClass}`}
                        >
                          <span className="text-[11px] leading-none">{seatObj.seatNo}</span>
                          {isSelected && (
                            <span className="text-[8px] uppercase tracking-tighter font-extrabold mt-0.5">
                              {selectedObj?.gender === "FEMALE" ? "♀" : "♂"}
                            </span>
                          )}
                          {isFemaleRestricted && !isSelected && (
                            <span className="text-[9px] text-pink-200 leading-none">♀</span>
                          )}
                        </button>
                      );
                    };

                    return (
                      <div key={rowNum} className="flex items-center justify-between gap-1">
                        
                        {/* Left Side Seats */}
                        <div className="flex items-center gap-2">
                          {renderSeatButton(s1)}
                          {renderSeatButton(s2)}
                        </div>

                        {/* Aisle Corridor */}
                        <div className="w-8 text-center text-[10px] font-mono text-slate-700 select-none">
                          {rowNum}
                        </div>

                        {/* Right Side Seats */}
                        <div className="flex items-center gap-2">
                          {renderSeatButton(s3)}
                          {!is2x1 && renderSeatButton(s4)}
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Back of Bus */}
                <div className="pt-6 mt-6 border-t border-slate-800 text-center text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                  Rear of Bus
                </div>

              </div>
            </div>

            {/* Right: Booking Summary Sidebar (4 Columns) */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-xl sticky top-24 space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Armchair className="w-5 h-5 text-sky-400" />
                  <span>Reservation Summary</span>
                </h2>

                {/* Stop Segments Info */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Boarding Point</span>
                    <span className="font-bold text-white">{fromCity || trip?.fromStop.cityName}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Dropping Point</span>
                    <span className="font-bold text-white">{toCity || trip?.toStop.cityName}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Bus Type &amp; Layout</span>
                    <span className="font-bold text-sky-300">{trip?.bus.type} ({trip?.bus.layout})</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Fare per seat</span>
                    <span className="font-bold text-emerald-400">Rs. {trip?.fare.toLocaleString()}</span>
                  </div>
                </div>

                {/* Selected Seats List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Selected Seats ({selectedSeats.length} / {maxPassengers})
                    </span>
                  </div>

                  {selectedSeats.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                      Click an available green seat on the map to select your seat and passenger gender.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedSeats.map((s, idx) => (
                        <div
                          key={s.seatNo}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                              {s.seatNo}
                            </span>
                            <span className="font-semibold text-white">Passenger {idx + 1}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              s.gender === "FEMALE"
                                ? "bg-pink-950 text-pink-300 border border-pink-800"
                                : "bg-blue-950 text-sky-300 border border-blue-800"
                            }`}>
                              {s.gender}
                            </span>
                          </div>

                          <div className="font-bold text-emerald-400">
                            Rs. {trip?.fare.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total Fare Breakdown */}
                {selectedSeats.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">Total Payable</span>
                      <span className="text-2xl font-black text-emerald-400">
                        Rs. {totalFare.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">Includes all taxes</span>
                  </div>
                )}

                {/* Continue Button */}
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  disabled={selectedSeats.length === 0 || locking}
                  className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {locking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Securing Hold...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Passenger Details</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Seats are held for 10 minutes during checkout</span>
                </p>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* Gender Selection Prompt Modal */}
      {genderModalSeat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-sky-400 flex items-center justify-center mx-auto mb-2">
                <Armchair className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Select Passenger Gender</h3>
              <p className="text-xs text-slate-400 mt-1">
                Seat <span className="text-white font-bold">#{genderModalSeat.seatNo}</span> ({fromCity || trip?.fromStop.cityName} → {toCity || trip?.toStop.cityName})
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
              <HeartHandshake className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
              <span>
                According to intercity bus guidelines in Pakistan, seats adjacent to female passengers are reserved for females.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => confirmSeatGender(genderModalSeat, "MALE")}
                className="p-3.5 rounded-2xl bg-blue-950/90 border-2 border-blue-600 hover:bg-blue-600 hover:text-white text-sky-300 font-bold text-xs flex flex-col items-center gap-1.5 transition-all shadow-md group"
              >
                <span className="text-xl">👨</span>
                <span>Male (مرد)</span>
              </button>

              <button
                type="button"
                onClick={() => confirmSeatGender(genderModalSeat, "FEMALE")}
                className="p-3.5 rounded-2xl bg-pink-950/90 border-2 border-pink-500 hover:bg-pink-500 hover:text-white text-pink-300 font-bold text-xs flex flex-col items-center gap-1.5 transition-all shadow-md group"
              >
                <span className="text-xl">👩</span>
                <span>Female (خاتون)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setGenderModalSeat(null)}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function TripSeatSelectionPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Seat Selection...</div>}>
      <SeatSelectionContent />
    </Suspense>
  );
}
