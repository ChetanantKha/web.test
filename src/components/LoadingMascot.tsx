export default function LoadingMascot({ label = "กำลังโหลด..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10">
      <svg viewBox="0 0 100 100" className="h-20 w-20 animate-mascot-fly">
        <defs>
          <linearGradient id="mascotTail" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="55%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <radialGradient id="mascotCore" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="35%" stopColor="#fdba74" />
            <stop offset="70%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
        </defs>
        <path
          d="M8,8 Q38,18 52,52"
          stroke="url(#mascotTail)"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <circle cx="64" cy="64" r="24" fill="url(#mascotCore)" className="animate-mascot-glow" />
      </svg>
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
  );
}
