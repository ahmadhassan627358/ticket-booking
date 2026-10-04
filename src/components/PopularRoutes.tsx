import Link from "next/link";
import { Navigation, Clock, ShieldCheck, ArrowRight, Bus } from "lucide-react";

export default function PopularRoutes() {
  const todayStr = new Date().toISOString().split("T")[0];

  const routes = [
    {
      id: "lhe-isb",
      name: "Lahore ↔ Islamabad",
      via: "Via Sargodha Motorway",
      from: "Lahore",
      to: "Islamabad",
      duration: "4h 30m",
      fareFrom: 1200,
      fullFare: 2200,
      busTypes: ["Business 2x1", "Executive 2x2"],
      departures: "6 Daily Departures",
      tag: "Most Popular",
    },
    {
      id: "lhe-khi",
      name: "Lahore ↔ Karachi",
      via: "Via Multan & Sukkur Corridors",
      from: "Lahore",
      to: "Karachi",
      duration: "16h",
      fareFrom: 1500,
      fullFare: 4800,
      busTypes: ["Luxury Sleeper 2x1", "Executive 2x2"],
      departures: "6 Daily Departures",
      tag: "Express Long Haul",
    },
    {
      id: "isb-pew",
      name: "Islamabad ↔ Peshawar",
      via: "Via M-1 Motorway",
      from: "Islamabad",
      to: "Peshawar",
      duration: "2h 15m",
      fareFrom: 1100,
      fullFare: 1100,
      busTypes: ["Business 2x1", "Executive 2x2"],
      departures: "6 Daily Departures",
      tag: "Fast Track",
    },
    {
      id: "lhe-fsd",
      name: "Lahore ↔ Faisalabad",
      via: "Via M-3 Express Corridor",
      from: "Lahore",
      to: "Faisalabad",
      duration: "1h 45m",
      fareFrom: 900,
      fullFare: 900,
      busTypes: ["Business 2x1", "Executive 2x2"],
      departures: "6 Daily Departures",
      tag: "Frequent Shuttle",
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-950/60 border border-sky-800/60 px-3 py-1 rounded-full mb-2">
            <Navigation className="w-3.5 h-3.5" />
            <span>Top Intercity Travel</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Popular Bus <span className="text-sky-400">Routes</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Explore Pakistan&apos;s most booked routes with luxury Daewoo, Scania, and Volvo fleets
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {routes.map((route) => (
          <div
            key={route.id}
            className="bg-slate-900/90 border border-slate-800 hover:border-blue-700/60 rounded-2xl p-5 shadow-lg shadow-blue-950/20 hover:shadow-xl hover:shadow-blue-900/30 transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-950 text-sky-300 border border-blue-800/60">
                  {route.tag}
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" />
                  <span>{route.duration}</span>
                </span>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">
                {route.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{route.via}</p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-slate-400 text-[11px] truncate">
                    {route.busTypes.join(" • ")}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400 font-medium">
                  {route.departures}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Starting from</span>
                <div className="text-lg font-black text-emerald-400">
                  Rs. {route.fareFrom.toLocaleString()}
                </div>
              </div>

              <Link
                href={`/trips?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(
                  route.to
                )}&date=${todayStr}&passengers=1`}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all group-hover:translate-x-0.5"
              >
                <span>Book</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
