export default function GlobalLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-white bg-slate-950">
      <div className="text-center space-y-4">
        <div className="relative w-14 h-14 mx-auto">
          <div className="w-14 h-14 rounded-full border-4 border-slate-800 border-t-sky-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xs">
            🚌
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-white tracking-wide">
            Loading Safar Express...
          </p>
          <p className="text-xs text-slate-400">
            Fetching bus schedules, routes and live seat availability
          </p>
        </div>
      </div>
    </div>
  );
}
