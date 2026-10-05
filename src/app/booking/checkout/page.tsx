"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Bus,
  Clock,
  MapPin,
  Calendar,
  Users,
  CreditCard,
  Banknote,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Timer,
  User,
  Phone,
  Mail,
  FileText,
  Lock,
  Sparkles,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { pakPhoneRegex, pakCnicRegex, normalizePakPhone, normalizePakCNIC } from "@/lib/validations";

interface SelectedSeatParam {
  seatNo: number;
  gender: "MALE" | "FEMALE";
}

interface PassengerFormState {
  seatNo: number;
  passengerName: string;
  cnic: string;
  gender: "MALE" | "FEMALE";
}

interface TripDetails {
  id: string;
  routeName: string;
  departureTime: string;
  fare: number;
  fromStop: { id: string; cityName: string; stopOrder: number };
  toStop: { id: string; cityName: string; stopOrder: number };
  bus: { id: string; number: string; type: string; layout: string; totalSeats: number };
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: authSession } = useSession();

  const tripId = searchParams.get("tripId") || "";
  const fromStopId = searchParams.get("fromStopId") || "";
  const toStopId = searchParams.get("toStopId") || "";
  const fromCity = searchParams.get("fromCity") || "";
  const toCity = searchParams.get("toCity") || "";
  const rawSeats = searchParams.get("seats") || "[]";
  const paramSessionId = searchParams.get("sessionId") || "";

  // Session ID
  const [sessionId, setSessionId] = useState<string>(paramSessionId);
  useEffect(() => {
    if (!sessionId) {
      const stored = sessionStorage.getItem("safar_session_id") || "";
      setSessionId(stored);
    }
  }, [sessionId]);

  // Parse Selected Seats
  const initialSeats: SelectedSeatParam[] = useMemo(() => {
    try {
      return JSON.parse(rawSeats);
    } catch {
      return [];
    }
  }, [rawSeats]);

  // Trip & Summary State
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);

  // Passenger Form State
  const [passengers, setPassengers] = useState<PassengerFormState[]>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<"MOCK_ONLINE" | "CASH" | "EASYPAISA" | "JAZZCASH" | "STRIPE">("EASYPAISA");

  // Mobile Wallet State (Easypaisa / JazzCash)
  const [walletNumber, setWalletNumber] = useState("");

  // Card / Simulator / Stripe Details
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");
  const [cardHolder, setCardHolder] = useState("");
  const [forceFail, setForceFail] = useState(false);

  // Form Errors & Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; code?: string } | null>(null);

  // Hold Timer (10 minutes countdown)
  const [timeRemaining, setTimeRemaining] = useState<number>(600);

  // Fetch Trip Details
  useEffect(() => {
    if (!tripId) return;

    fetch(`/api/trips/${tripId}/seats?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&sessionId=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.trip) {
          setTrip(data.trip);
        }
        setLoadingTrip(false);
      })
      .catch((err) => {
        console.error("Error loading trip for checkout:", err);
        setLoadingTrip(false);
      });
  }, [tripId, fromCity, toCity, sessionId]);

  // Initialize Passenger Form
  useEffect(() => {
    if (initialSeats.length > 0 && passengers.length === 0) {
      setPassengers(
        initialSeats.map((s, idx) => ({
          seatNo: s.seatNo,
          passengerName: idx === 0 && authSession?.user?.name ? authSession.user.name : "",
          cnic: "",
          gender: s.gender || "MALE",
        }))
      );
    }
  }, [initialSeats, passengers.length, authSession]);

  // Pre-fill user profile if logged in
  useEffect(() => {
    if (authSession?.user) {
      if (!contactPhone && authSession.user.phone) {
        setContactPhone(authSession.user.phone);
      }
      if (!contactEmail && authSession.user.email) {
        setContactEmail(authSession.user.email);
      }
      if (!cardHolder && authSession.user.name) {
        setCardHolder(authSession.user.name);
      }
    }
  }, [authSession, contactPhone, contactEmail, cardHolder]);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setServerError({
            message: "Your 10-minute seat lock reservation has expired. Please select your seats again.",
            code: "LOCKS_EXPIRED",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  }, [timeRemaining]);

  // CNIC input auto-formatter
  const handleCnicChange = (index: number, val: string) => {
    // Keep only digits
    const digits = val.replace(/\D/g, "").slice(0, 13);
    let formatted = digits;
    if (digits.length > 5 && digits.length <= 12) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    } else if (digits.length > 12) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
    }

    const updated = [...passengers];
    updated[index].cnic = formatted;
    setPassengers(updated);

    // Clear error
    if (errors[`passenger_${index}_cnic`]) {
      const errs = { ...errors };
      delete errs[`passenger_${index}_cnic`];
      setErrors(errs);
    }
  };

  // Phone input auto-formatter
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    let formatted = val;
    if (digits.startsWith("03") && digits.length <= 11) {
      if (digits.length > 4) {
        formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
      } else {
        formatted = digits;
      }
    }
    setContactPhone(formatted);
    if (errors.contactPhone) {
      const errs = { ...errors };
      delete errs.contactPhone;
      setErrors(errs);
    }
  };

  const handlePassengerChange = (index: number, field: keyof PassengerFormState, val: any) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: val };
    setPassengers(updated);

    const errKey = `passenger_${index}_${field}`;
    if (errors[errKey]) {
      const errs = { ...errors };
      delete errs[errKey];
      setErrors(errs);
    }
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    // Validate Contact Mobile
    if (!contactPhone.trim()) {
      errs.contactPhone = "Contact mobile number is required.";
    } else if (!pakPhoneRegex.test(contactPhone.trim())) {
      errs.contactPhone = "Please enter a valid Pakistani mobile number (03XX-XXXXXXX).";
    }

    // Validate Contact Email if provided
    if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errs.contactEmail = "Please enter a valid email address.";
    }

    // Validate Each Passenger
    passengers.forEach((p, idx) => {
      if (!p.passengerName.trim()) {
        errs[`passenger_${idx}_name`] = `Passenger ${idx + 1} name is required.`;
      } else if (p.passengerName.trim().length < 2) {
        errs[`passenger_${idx}_name`] = "Name must be at least 2 characters.";
      }

      if (!p.cnic.trim()) {
        errs[`passenger_${idx}_cnic`] = `Passenger ${idx + 1} CNIC is required.`;
      } else if (!pakCnicRegex.test(p.cnic.trim())) {
        errs[`passenger_${idx}_cnic`] = "CNIC format must be 12345-1234567-1 (13 digits).";
      }
    });

    // Validate Mobile Wallet if Easypaisa or JazzCash
    if (paymentMethod === "EASYPAISA" || paymentMethod === "JAZZCASH") {
      const activeWallet = walletNumber.trim() || contactPhone.trim();
      if (!activeWallet) {
        errs.walletNumber = `${paymentMethod === "EASYPAISA" ? "Easypaisa" : "JazzCash"} mobile account number is required.`;
      } else if (!pakPhoneRegex.test(activeWallet)) {
        errs.walletNumber = "Please enter a valid Pakistani mobile number (03XX-XXXXXXX).";
      }
    }

    // Validate Card if Mock Online or Stripe selected
    if (paymentMethod === "MOCK_ONLINE" || paymentMethod === "STRIPE") {
      if (!cardNumber.replace(/\s/g, "")) {
        errs.cardNumber = "Card number is required.";
      }
      if (!cardExpiry.trim()) {
        errs.cardExpiry = "Expiry MM/YY required.";
      }
      if (!cardCvc.trim()) {
        errs.cardCvc = "CVC required.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (timeRemaining <= 0) {
      setServerError({
        message: "Your seat reservation hold expired. Please re-select your seats.",
        code: "LOCKS_EXPIRED",
      });
      return;
    }

    setSubmitting(true);

    try {
      let paymentMetadata: Record<string, any> | undefined = undefined;

      if (paymentMethod === "EASYPAISA" || paymentMethod === "JAZZCASH") {
        paymentMetadata = {
          walletNumber: walletNumber.trim() || contactPhone.trim(),
          forceFail,
        };
      } else if (paymentMethod === "MOCK_ONLINE" || paymentMethod === "STRIPE") {
        paymentMetadata = {
          cardNumber,
          cardExpiry,
          cardCvc,
          cardHolder: cardHolder || passengers[0]?.passengerName || "Customer",
          forceFail,
        };
      }

      const payload = {
        tripId,
        fromStopId: fromStopId || trip?.fromStop.id,
        toStopId: toStopId || trip?.toStop.id,
        sessionId,
        contactPhone,
        contactEmail: contactEmail.trim() || undefined,
        paymentMethod,
        paymentMetadata,
        passengers: passengers.map((p) => ({
          seatNo: p.seatNo,
          passengerName: p.passengerName,
          cnic: p.cnic,
          gender: p.gender,
        })),
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError({
          message: data.error || "Unable to complete booking. Please try again.",
          code: data.code || "SUBMISSION_ERROR",
        });
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Success! Clear session locks and navigate to confirmation page
      router.push(`/booking/${data.pnr}`);
    } catch (err: unknown) {
      console.error("Booking submission network error:", err);
      setServerError({
        message: "Connection lost while processing your booking. Please try again.",
        code: "NETWORK_ERROR",
      });
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const totalFare = trip ? trip.fare * passengers.length : 0;

  if (loadingTrip) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-300 font-medium">Securing checkout session...</p>
        </div>
      </div>
    );
  }

  if (!trip || passengers.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center text-white space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black">No Seats Selected</h2>
        <p className="text-sm text-slate-400">
          Your checkout session has no reserved seats. Please select a trip and choose your preferred seats first.
        </p>
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Available Trips</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Progress & Header */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 border border-blue-800/40 rounded-3xl p-5 sm:p-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
                <span>Step 3 of 3</span>
                <span>•</span>
                <span>Passenger Details &amp; Payment</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>Finalize Ticket Booking</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Guest Booking Allowed
                </span>
              </h1>
            </div>

            {/* Hold Timer */}
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
              timeRemaining < 120
                ? "bg-red-950/80 border-red-700 text-red-200 animate-bounce"
                : "bg-amber-950/80 border-amber-600/80 text-amber-200"
            }`}>
              <Timer className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Seats Locked For</div>
                <div className="text-lg font-black font-mono text-white">{formattedTimer}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Server or Validation Errors Banner */}
        {serverError && (
          <div className="p-5 rounded-3xl bg-red-950/90 border-2 border-red-800 text-red-100 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-base text-white">Booking Error</div>
                <div className="text-xs text-red-200 mt-0.5">{serverError.message}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {serverError.code === "LOCKS_EXPIRED" || serverError.code === "SEAT_ALREADY_BOOKED" ? (
                <Link
                  href={`/trips/${tripId}/seats?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`}
                  className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Select Seats Again</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setServerError(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleBookingSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Form Details (8 cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* 1. Primary Contact Details Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Phone className="w-5 h-5 text-sky-400" />
                    <span>Primary Contact Details</span>
                  </h2>
                  <span className="text-xs text-slate-400">E-Ticket &amp; SMS alerts will be sent here</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mobile Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-xs font-bold">
                        🇵🇰 +92
                      </div>
                      <input
                        type="text"
                        placeholder="0300-1234567"
                        value={contactPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className={`w-full bg-slate-950 border pl-20 pr-4 py-3 rounded-2xl text-sm text-white focus:outline-none transition-colors ${
                          errors.contactPhone ? "border-red-500 focus:border-red-400" : "border-slate-800 focus:border-sky-500"
                        }`}
                      />
                    </div>
                    {errors.contactPhone && (
                      <p className="text-red-400 text-xs mt-1">{errors.contactPhone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address <span className="text-slate-500 font-normal">(Optional for E-Ticket PDF)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        placeholder="customer@example.com"
                        value={contactEmail}
                        onChange={(e) => {
                          setContactEmail(e.target.value);
                          if (errors.contactEmail) {
                            const errs = { ...errors };
                            delete errs.contactEmail;
                            setErrors(errs);
                          }
                        }}
                        className={`w-full bg-slate-950 border pl-10 pr-4 py-3 rounded-2xl text-sm text-white focus:outline-none transition-colors ${
                          errors.contactEmail ? "border-red-500 focus:border-red-400" : "border-slate-800 focus:border-sky-500"
                        }`}
                      />
                    </div>
                    {errors.contactEmail && (
                      <p className="text-red-400 text-xs mt-1">{errors.contactEmail}</p>
                    )}
                  </div>
                </div>

                {!authSession?.user && (
                  <p className="text-xs text-sky-400/90 bg-sky-950/40 border border-sky-900/60 rounded-xl p-2.5">
                    💡 Booking as guest. If you have a Safar Express account,{" "}
                    <Link href={`/login?callbackUrl=${encodeURIComponent(window?.location?.href || "")}`} className="underline font-bold text-sky-300">
                      login here
                    </Link>{" "}
                    to automatically attach this booking to your account.
                  </p>
                )}
              </div>

              {/* 2. Passenger Details Cards */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-400" />
                    <span>Passenger Information</span>
                  </h2>
                  <span className="text-xs text-slate-400">
                    {passengers.length} Passenger{passengers.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-4">
                  {passengers.map((p, idx) => (
                    <div
                      key={p.seatNo}
                      className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4 relative"
                    >
                      {/* Passenger Header Tag */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-amber-500/20">
                            #{p.seatNo}
                          </span>
                          <div>
                            <span className="font-bold text-white text-sm">
                              Passenger {idx + 1}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                              (Seat {p.seatNo})
                            </span>
                          </div>
                        </div>

                        {/* Gender Badge / Selector */}
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handlePassengerChange(idx, "gender", "MALE")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              p.gender === "MALE"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            👨 Male
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePassengerChange(idx, "gender", "FEMALE")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              p.gender === "FEMALE"
                                ? "bg-pink-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            👩 Female
                          </button>
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Passenger Name */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Full Name <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                              <User className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              placeholder="e.g. Muhammad Ali"
                              value={p.passengerName}
                              onChange={(e) => handlePassengerChange(idx, "passengerName", e.target.value)}
                              className={`w-full bg-slate-900 border pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none transition-colors ${
                                errors[`passenger_${idx}_name`]
                                  ? "border-red-500 focus:border-red-400"
                                  : "border-slate-800 focus:border-sky-500"
                              }`}
                            />
                          </div>
                          {errors[`passenger_${idx}_name`] && (
                            <p className="text-red-400 text-xs mt-1">
                              {errors[`passenger_${idx}_name`]}
                            </p>
                          )}
                        </div>

                        {/* Passenger CNIC */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            National CNIC <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                              <FileText className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              maxLength={15}
                              placeholder="35201-1234567-1"
                              value={p.cnic}
                              onChange={(e) => handleCnicChange(idx, e.target.value)}
                              className={`w-full bg-slate-900 border pl-10 pr-4 py-2.5 rounded-xl text-sm font-mono text-white focus:outline-none transition-colors ${
                                errors[`passenger_${idx}_cnic`]
                                  ? "border-red-500 focus:border-red-400"
                                  : "border-slate-800 focus:border-sky-500"
                              }`}
                            />
                          </div>
                          {errors[`passenger_${idx}_cnic`] && (
                            <p className="text-red-400 text-xs mt-1">
                              {errors[`passenger_${idx}_cnic`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Payment Method Card (Payment Abstraction Layer) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-sky-400" />
                    <span>Select Payment Provider</span>
                  </h2>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit SSL Encrypted
                  </span>
                </div>

                {/* Provider Tabs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Easypaisa */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("EASYPAISA")}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 ${
                      paymentMethod === "EASYPAISA"
                        ? "bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-500/20"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-xs">
                          EP
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">Easypaisa</div>
                          <div className="text-[10px] text-emerald-400">Mobile Wallet / Push</div>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === "EASYPAISA" ? "border-emerald-500 bg-emerald-500" : "border-slate-700"
                      }`}>
                        {paymentMethod === "EASYPAISA" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-300 font-medium">
                      ✓ Instant OTP / MPIN prompt
                    </span>
                  </button>

                  {/* JazzCash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("JAZZCASH")}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 ${
                      paymentMethod === "JAZZCASH"
                        ? "bg-amber-950/60 border-orange-500 shadow-lg shadow-orange-500/20"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 font-black flex items-center justify-center text-xs">
                          JC
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">JazzCash</div>
                          <div className="text-[10px] text-orange-400">Mobile Account</div>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === "JAZZCASH" ? "border-orange-500 bg-orange-500" : "border-slate-700"
                      }`}>
                        {paymentMethod === "JAZZCASH" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    <span className="text-[10px] text-orange-300 font-medium">
                      ✓ Instant USSD prompt
                    </span>
                  </button>

                  {/* Stripe Cards */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("STRIPE")}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 ${
                      paymentMethod === "STRIPE"
                        ? "bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-500/20"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-black flex items-center justify-center text-xs">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">Stripe Card</div>
                          <div className="text-[10px] text-indigo-300">Visa / MC / Apple Pay</div>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === "STRIPE" ? "border-indigo-500 bg-indigo-500" : "border-slate-700"
                      }`}>
                        {paymentMethod === "STRIPE" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-300 font-medium">
                      ✓ 3D Secure / Global
                    </span>
                  </button>

                  {/* Card Simulator */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("MOCK_ONLINE")}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 ${
                      paymentMethod === "MOCK_ONLINE"
                        ? "bg-blue-950/60 border-blue-500 shadow-lg shadow-blue-500/20"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-sky-400 flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">Card Simulator</div>
                          <div className="text-[10px] text-slate-400">Sandbox Test</div>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === "MOCK_ONLINE" ? "border-blue-500 bg-blue-500" : "border-slate-700"
                      }`}>
                        {paymentMethod === "MOCK_ONLINE" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      ✓ Instant E-Ticket PDF
                    </span>
                  </button>

                  {/* Cash at Counter */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 ${
                      paymentMethod === "CASH"
                        ? "bg-amber-950/60 border-amber-500 shadow-lg shadow-amber-500/20"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-600/30 text-amber-400 flex items-center justify-center">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">Cash Counter</div>
                          <div className="text-[10px] text-slate-400">Pay at terminal</div>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === "CASH" ? "border-amber-500 bg-amber-500" : "border-slate-700"
                      }`}>
                        {paymentMethod === "CASH" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 font-medium">
                      ⏱ Holds seat 2h before
                    </span>
                  </button>
                </div>

                {/* Sub-form: Easypaisa Form */}
                {paymentMethod === "EASYPAISA" && (
                  <div className="p-4 sm:p-5 bg-emerald-950/30 rounded-2xl border border-emerald-800/80 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Easypaisa Account Details
                      </span>
                      <span className="text-[11px] bg-emerald-900/60 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-700">
                        Live Instant MA
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Easypaisa Registered Mobile Number <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400 text-xs font-bold">
                          🇵🇰 +92
                        </div>
                        <input
                          type="text"
                          placeholder={contactPhone || "0345-1234567"}
                          value={walletNumber}
                          onChange={(e) => {
                            setWalletNumber(e.target.value);
                            if (errors.walletNumber) {
                              const errs = { ...errors };
                              delete errs.walletNumber;
                              setErrors(errs);
                            }
                          }}
                          className={`w-full bg-slate-900 border pl-20 pr-4 py-2.5 rounded-xl text-sm font-mono text-white focus:outline-none transition-colors ${
                            errors.walletNumber ? "border-red-500 focus:border-red-400" : "border-emerald-800 focus:border-emerald-400"
                          }`}
                        />
                      </div>
                      {errors.walletNumber && (
                        <p className="text-red-400 text-xs mt-1">{errors.walletNumber}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Leave blank to use your primary contact number (<strong>{contactPhone || "03XX-XXXXXXX"}</strong>). You will receive an approval prompt on your phone.
                      </p>
                    </div>
                  </div>
                )}

                {/* Sub-form: JazzCash Form */}
                {paymentMethod === "JAZZCASH" && (
                  <div className="p-4 sm:p-5 bg-amber-950/30 rounded-2xl border border-orange-800/80 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> JazzCash Mobile Account Details
                      </span>
                      <span className="text-[11px] bg-orange-900/60 text-orange-300 font-bold px-2 py-0.5 rounded-full border border-orange-700">
                        Instant USSD / Push
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        JazzCash Mobile Account Number <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-orange-400 text-xs font-bold">
                          🇵🇰 +92
                        </div>
                        <input
                          type="text"
                          placeholder={contactPhone || "0300-1234567"}
                          value={walletNumber}
                          onChange={(e) => {
                            setWalletNumber(e.target.value);
                            if (errors.walletNumber) {
                              const errs = { ...errors };
                              delete errs.walletNumber;
                              setErrors(errs);
                            }
                          }}
                          className={`w-full bg-slate-900 border pl-20 pr-4 py-2.5 rounded-xl text-sm font-mono text-white focus:outline-none transition-colors ${
                            errors.walletNumber ? "border-red-500 focus:border-red-400" : "border-orange-800 focus:border-orange-400"
                          }`}
                        />
                      </div>
                      {errors.walletNumber && (
                        <p className="text-red-400 text-xs mt-1">{errors.walletNumber}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        A USSD MPIN prompt will appear automatically on your Jazz mobile phone to authorize the transaction.
                      </p>
                    </div>
                  </div>
                )}

                {/* Sub-form: Card Form if MOCK_ONLINE or STRIPE */}
                {(paymentMethod === "MOCK_ONLINE" || paymentMethod === "STRIPE") && (
                  <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {paymentMethod === "STRIPE" ? "Stripe 3D-Secure Card Details" : "Card Gateway Simulator Details"}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">{paymentMethod === "STRIPE" ? "Live Encrypted" : "Test Mode"}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          placeholder="4242 4242 4242 4242"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                        />
                        {errors.cardNumber && (
                          <p className="text-red-400 text-xs mt-1">{errors.cardNumber}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Expiry (MM/YY)
                          </label>
                          <input
                            type="text"
                            placeholder="12/28"
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            CVC / CVV
                          </label>
                          <input
                            type="password"
                            placeholder="123"
                            maxLength={4}
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      {/* Test Failure Switch for Verification */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between bg-slate-900/50 p-3 rounded-xl">
                        <div className="text-xs">
                          <span className="font-bold text-slate-300 block">Simulate Gateway Decline / Failure</span>
                          <span className="text-slate-500 text-[11px]">Force test payment failure for verification</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={forceFail}
                            onChange={(e) => setForceFail(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-form: Cash Notice if CASH */}
                {paymentMethod === "CASH" && (
                  <div className="p-4 sm:p-5 bg-amber-950/30 rounded-2xl border border-amber-700/60 text-xs text-amber-200 space-y-2 animate-in fade-in">
                    <div className="font-bold flex items-center gap-2 text-amber-300">
                      <Banknote className="w-4 h-4" />
                      <span>Cash Reservation Guidelines</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90">
                      <li>Your booking will be placed in <strong>PENDING</strong> status.</li>
                      <li>You must arrive at the terminal counter and pay the fare in cash at least <strong>2 hours prior to departure</strong>.</li>
                      <li>If unpaid 2 hours before trip departure, your reservation will automatically expire and seats will be released to waiting passengers.</li>
                    </ul>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Reservation Sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-6">

              <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-xl sticky top-24 space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Bus className="w-5 h-5 text-sky-400" />
                  <span>Trip Summary</span>
                </h2>

                {/* Trip Route Card */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>{trip.fromStop.cityName} → {trip.toStop.cityName}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950 text-sky-300 border border-blue-800 font-semibold">
                      {trip.bus.type}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-slate-300 font-medium">
                        {new Date(trip.departureTime).toLocaleDateString("en-PK", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-slate-300 font-medium">
                        {new Date(trip.departureTime).toLocaleTimeString("en-PK", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Bus className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-300">Bus: {trip.bus.number} ({trip.bus.layout})</span>
                    </div>
                  </div>
                </div>

                {/* Selected Seats Roster */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Selected Seats</span>
                    <span>{passengers.length} Seat{passengers.length > 1 ? "s" : ""}</span>
                  </div>

                  <div className="space-y-1.5">
                    {passengers.map((p, idx) => (
                      <div
                        key={p.seatNo}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                            {p.seatNo}
                          </span>
                          <span className="font-semibold text-slate-200">
                            {p.passengerName || `Passenger ${idx + 1}`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({p.gender === "FEMALE" ? "♀" : "♂"})
                          </span>
                        </div>
                        <div className="font-bold text-emerald-400">
                          Rs. {trip.fare.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fare Breakdown */}
                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Base Ticket Fare ({passengers.length} × {trip.fare})</span>
                    <span className="text-slate-200 font-medium">Rs. {totalFare.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Terminal Service Tax</span>
                    <span className="text-emerald-400 font-medium">Rs. 0 (Waived)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Total Amount</span>
                    <span className="text-2xl font-black text-emerald-400">
                      Rs. {totalFare.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Submit Booking Button */}
                <button
                  type="submit"
                  disabled={submitting || timeRemaining <= 0}
                  className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Securing &amp; Issuing Ticket...</span>
                    </>
                  ) : (
                    <>
                      <span>{paymentMethod === "MOCK_ONLINE" ? "Pay & Confirm Booking" : "Confirm Cash Reservation"}</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guaranteed safe reservation with instant 8-char PNR</span>
                </p>

              </div>

            </div>

          </div>
        </form>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
