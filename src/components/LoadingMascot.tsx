export default function LoadingMascot({ label = "กำลังโหลด..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 py-10">
      <svg viewBox="0 0 100 100" className="h-20 w-20 animate-mascot-fly">
        <defs>
          <linearGradient id="mascotMane" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          <linearGradient id="mascotFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f0b429" />
          </linearGradient>
          <linearGradient id="mascotSkate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="mascotJacket" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>

        {/* motion lines */}
        <g className="animate-mascot-motionlines">
          <path
            d="M4,66 C10,64 16,64 20,66"
            stroke="#93c5fd"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M2,74 C9,73 15,73 19,75"
            stroke="#93c5fd"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>

        {/* tail */}
        <path d="M36,60 C24,56 20,46 26,38" stroke="url(#mascotMane)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <circle cx="26" cy="38" r="4.4" fill="url(#mascotMane)" />

        {/* back leg (extended, trailing) */}
        <path
          d="M42,66 C34,72 26,76 21,80"
          stroke="#f0b429"
          strokeWidth="7.5"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="10" y="79" width="17" height="8" rx="4" fill="url(#mascotSkate)" />
        <circle cx="15" cy="90" r="2.3" fill="#dbeafe" />
        <circle cx="22" cy="90" r="2.3" fill="#dbeafe" />

        {/* back arm: sleeve + bare forearm */}
        <path
          d="M40,51 C37,52 34,54 32,56"
          stroke="url(#mascotJacket)"
          strokeWidth="5.6"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M32,56 C30,58 28,60 26,63" stroke="#f0b429" strokeWidth="5" fill="none" strokeLinecap="round" />

        {/* torso (fur base peeks at hem/neck) */}
        <ellipse cx="50" cy="54" rx="13" ry="15" fill="url(#mascotFur)" />

        {/* front leg (bent forward, lifted) */}
        <path
          d="M58,66 C64,70 67,74 63,78"
          stroke="#f0b429"
          strokeWidth="7.5"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="58" y="76" width="17" height="8" rx="4" fill="url(#mascotSkate)" transform="rotate(16 66.5 80)" />
        <circle cx="63" cy="86" r="2.3" fill="#dbeafe" />
        <circle cx="71" cy="83" r="2.3" fill="#dbeafe" />

        {/* jacket */}
        <ellipse cx="50" cy="56" rx="11.5" ry="12.5" fill="url(#mascotJacket)" />
        <path d="M43,45 L47,41 L49,48 Z" fill="#dc2626" />
        <path d="M57,45 L53,41 L51,48 Z" fill="#dc2626" />
        <path d="M50,46 L50,66" stroke="#fecaca" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
        <circle cx="50" cy="52" r="0.9" fill="#fecaca" opacity="0.9" />
        <circle cx="50" cy="58" r="0.9" fill="#fecaca" opacity="0.9" />

        {/* mane */}
        <path
          d="M58,18
             C61,20 62,23 60,25
             C64,24 67,26 66,29
             C70,29 72,32 69,34
             C72,36 71,40 67,40
             C68,44 65,47 61,45
             C60,49 56,50 54,47
             C51,50 47,49 47,45
             C43,46 40,43 42,39
             C38,39 36,35 39,32
             C36,29 38,25 42,25
             C41,21 44,18 47,20
             C48,16 52,15 54,18
             C55,15 59,15 58,18 Z"
          fill="url(#mascotMane)"
        />

        {/* head */}
        <circle cx="54" cy="32" r="13" fill="url(#mascotFur)" />

        {/* ears */}
        <circle cx="44" cy="22" r="3.6" fill="url(#mascotFur)" />
        <circle cx="44" cy="22" r="1.8" fill="#7c4a12" />
        <circle cx="64" cy="22" r="3.6" fill="url(#mascotFur)" />
        <circle cx="64" cy="22" r="1.8" fill="#7c4a12" />

        {/* muzzle */}
        <ellipse cx="54" cy="38" rx="6.8" ry="5.1" fill="#fff7e0" />

        {/* eyes: winking left, open right */}
        <path d="M44,30 Q47,28 50,30" stroke="#3b2411" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="61" cy="30" r="1.9" fill="#2a1a0d" />
        <circle cx="61.7" cy="29.4" r="0.7" fill="#fff" />

        {/* eyebrows: matched mirrored pair */}
        <path d="M43.5,25 Q47,23 50.5,25" stroke="#3b2411" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <path d="M57.5,25 Q61,23 64.5,25" stroke="#3b2411" strokeWidth="1.7" fill="none" strokeLinecap="round" />

        {/* nose */}
        <path d="M54,36 q1.6,1.1 0,2 q-1.6,-0.9 0,-2 Z" fill="#7c4a12" />

        {/* smirk mouth */}
        <path d="M48,41 Q54,44.4 60,40.5" stroke="#7c4a12" strokeWidth="1.7" fill="none" strokeLinecap="round" />

        {/* whiskers */}
        <path d="M42,37 L35,35 M42,40 L35,41" stroke="#c9a227" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M66,37 L73,35 M66,40 L73,41" stroke="#c9a227" strokeWidth="1.1" strokeLinecap="round" />

        {/* front arm: sleeve + bare hand, drawn on top */}
        <path
          d="M61,50 C64,48.5 67,46.5 69,44.5"
          stroke="url(#mascotJacket)"
          strokeWidth="5.6"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M69,44.5 C71,43 73,40.5 75,37" stroke="#f0b429" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="75" cy="36" r="3" fill="#f0b429" />
      </svg>
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
  );
}
