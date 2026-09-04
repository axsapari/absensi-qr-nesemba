import React from 'react';
import { useApp } from '../context/AppContext';

// Dynamic School Logo component (uses custom uploaded logo or defaults to official vector SVG)
export const SchoolLogo: React.FC<{
  className?: string;
  size?: number;
  customUrl?: string | null;
  forceDefault?: boolean;
}> = ({ className = 'w-14 h-14', size, customUrl, forceDefault = false }) => {
  let logoUrl = customUrl;
  try {
    const { profilSekolah } = useApp();
    if (!logoUrl && !forceDefault && profilSekolah?.customLogoUrl) {
      logoUrl = profilSekolah.customLogoUrl;
    }
  } catch {
    // If rendered outside AppProvider
  }

  if (logoUrl && !forceDefault) {
    const style = size ? { width: size, height: size } : undefined;
    return (
      <img
        src={logoUrl}
        alt="Logo Sekolah"
        className={`${className} object-contain`}
        style={style}
      />
    );
  }

  return <LogoSMPN9Banjar className={className} size={size} />;
};

// Official Logo SMP NEGERI 9 BANJAR (Vector SVG based on the school emblem)
export const LogoSMPN9Banjar: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-14 h-14',
  size,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="shieldBg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fef08a" />
          <stop offset="0.5" stopColor="#eab308" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
      </defs>

      {/* Outer Golden/Yellow Border */}
      <polygon
        points="60,6 108,18 102,84 60,114 18,84 12,18"
        fill="#facc15"
        stroke="#ca8a04"
        strokeWidth="2"
      />

      {/* Main Blue Shield */}
      <polygon
        points="60,10 104,21 98,82 60,110 22,82 16,21"
        fill="url(#shieldBg)"
        stroke="#1e3a8a"
        strokeWidth="1.5"
      />

      {/* Inner Crest Background - White/Cyan */}
      <path
        d="M60 20 C82 20 90 28 90 50 C90 75 75 92 60 100 C45 92 30 75 30 50 C30 28 38 20 60 20 Z"
        fill="#ffffff"
        stroke="#facc15"
        strokeWidth="1.5"
      />

      {/* Top Banner with Text "SMP NEGERI 9" */}
      <path
        d="M26 28 Q60 18 94 28"
        id="curveText"
        fill="none"
      />
      <text fill="#ffffff" fontSize="6.5" fontWeight="900" letterSpacing="0.6">
        <textPath href="#curveText" startOffset="50%" textAnchor="middle">
          SMP NEGERI 9
        </textPath>
      </text>

      {/* Golden Rice & Cotton Wreath */}
      <g stroke="#ca8a04" fill="#eab308" strokeWidth="0.5">
        {/* Left Rice */}
        <ellipse cx="40" cy="46" rx="3" ry="5" transform="rotate(-30 40 46)" />
        <ellipse cx="37" cy="56" rx="3" ry="5" transform="rotate(-15 37 56)" />
        <ellipse cx="38" cy="67" rx="3" ry="5" transform="rotate(10 38 67)" />
        <ellipse cx="43" cy="77" rx="3" ry="5" transform="rotate(35 43 77)" />

        {/* Right Cotton */}
        <circle cx="80" cy="46" r="3.5" fill="#f8fafc" stroke="#ca8a04" />
        <circle cx="83" cy="56" r="3.5" fill="#f8fafc" stroke="#ca8a04" />
        <circle cx="82" cy="67" r="3.5" fill="#f8fafc" stroke="#ca8a04" />
        <circle cx="77" cy="77" r="3.5" fill="#f8fafc" stroke="#ca8a04" />
      </g>

      {/* Central Torch with Flame */}
      <g>
        {/* Flame */}
        <path
          d="M60 38 C56 46 54 48 57 52 C59 55 60 55 60 55 C60 55 61 55 63 52 C66 48 64 46 60 38 Z"
          fill="#ef4444"
        />
        <path
          d="M60 42 C58 46 58 48 60 51 C62 48 62 46 60 42 Z"
          fill="#fbbf24"
        />
        {/* Torch Stem */}
        <rect x="58" y="54" width="4" height="12" fill="#d97706" rx="1" />
      </g>

      {/* Open Book */}
      <g fill="#ffffff" stroke="#1e3a8a" strokeWidth="1">
        <path d="M60 67 C54 64 45 64 42 66 L42 78 C45 76 54 76 60 79 Z" fill="#ffffff" />
        <path d="M60 67 C66 64 75 64 78 66 L78 78 C75 76 66 76 60 79 Z" fill="#ffffff" />
        <line x1="60" y1="67" x2="60" y2="79" stroke="#1e3a8a" strokeWidth="1.5" />
      </g>

      {/* Bottom Ribbon "BANJAR" */}
      <g>
        <path
          d="M32 94 L88 94 L84 103 L60 107 L36 103 Z"
          fill="#1d4ed8"
          stroke="#facc15"
          strokeWidth="1.5"
        />
        <text
          x="60"
          y="102"
          fill="#ffffff"
          fontSize="7"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="1"
        >
          BANJAR
        </text>
      </g>
    </svg>
  );
};

// Official OSIS Logo (Organisasi Siswa Intra Sekolah)
export const LogoOSIS: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-10 h-10',
  size,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Shield Outline */}
      <path
        d="M50 4 L88 18 C88 56 74 82 50 96 C26 82 12 56 12 18 Z"
        fill="#fef08a"
        stroke="#ca8a04"
        strokeWidth="2"
      />

      {/* Inner White Plate */}
      <path
        d="M50 10 L82 22 C82 54 70 76 50 88 C30 76 18 54 18 22 Z"
        fill="#ffffff"
      />

      {/* Red & White Stylized Emblem */}
      <circle cx="50" cy="44" r="22" fill="#ef4444" />
      <circle cx="50" cy="44" r="17" fill="#ffffff" />

      {/* OSIS Knowledge Book & Torch in Center */}
      <path
        d="M50 28 L46 38 L54 38 Z"
        fill="#dc2626"
      />
      <rect x="48.5" y="38" width="3" height="8" fill="#ca8a04" />

      {/* Book */}
      <path
        d="M38 52 Q44 48 50 51 Q56 48 62 52 L60 58 Q55 55 50 57 Q45 55 40 58 Z"
        fill="#1e3a8a"
      />

      {/* Stylized Rice & Cotton on flanks */}
      <path
        d="M30 40 Q26 52 34 62"
        stroke="#ca8a04"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M70 40 Q74 52 66 62"
        stroke="#ca8a04"
        strokeWidth="2"
        fill="none"
      />

      {/* OSIS Ribbon at Bottom */}
      <g>
        <path
          d="M26 72 L74 72 L70 82 L50 86 L30 82 Z"
          fill="#1e293b"
          stroke="#ca8a04"
          strokeWidth="1"
        />
        <text
          x="50"
          y="80"
          fill="#ffffff"
          fontSize="8"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="1.5"
        >
          OSIS
        </text>
      </g>
    </svg>
  );
};

// Official Tut Wuri Handayani (Kementerian Pendidikan dan Kebudayaan) Logo
export const LogoTutWuri: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-12 h-12',
  size,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Pentagon Frame */}
      <polygon
        points="50,4 95,36 78,92 22,92 5,36"
        fill="#0284c7"
        stroke="#0369a1"
        strokeWidth="2"
      />
      {/* Golden Inner Border */}
      <polygon
        points="50,8 90,38 74,88 26,88 10,38"
        fill="#f8fafc"
        stroke="#f59e0b"
        strokeWidth="1.5"
      />
      {/* Golden Wings and Torch of Education */}
      <path
        d="M20 50 Q35 40 50 62 Q65 40 80 50 Q75 68 50 78 Q25 68 20 50 Z"
        fill="#f59e0b"
      />
      {/* Flaming Torch in Center */}
      <path
        d="M50 22 C46 30 44 34 50 40 C56 34 54 30 50 22 Z"
        fill="#dc2626"
      />
      <path
        d="M48 40 L52 40 L51 60 L49 60 Z"
        fill="#ca8a04"
      />
      {/* Sun Rays / Radiance */}
      <circle cx="50" cy="36" r="3" fill="#fef08a" />
      {/* Text Banner: Tut Wuri Handayani */}
      <path
        d="M26 80 Q50 86 74 80 L72 86 Q50 92 28 86 Z"
        fill="#0284c7"
      />
      <text
        x="50"
        y="85"
        fill="#ffffff"
        fontSize="5"
        fontWeight="bold"
        textAnchor="middle"
        letterSpacing="0.5"
      >
        TUT WURI HANDAYANI
      </text>
    </svg>
  );
};

// Dynamic City Logo component (uses custom uploaded city logo or defaults to official vector LogoKotaBanjar)
export const CityLogo: React.FC<{
  className?: string;
  size?: number;
  customUrl?: string | null;
  forceDefault?: boolean;
}> = ({ className = 'w-14 h-14', size, customUrl, forceDefault = false }) => {
  let logoUrl = customUrl;
  try {
    const { profilSekolah } = useApp();
    if (!logoUrl && !forceDefault && profilSekolah?.customLogoKotaUrl) {
      logoUrl = profilSekolah.customLogoKotaUrl;
    }
  } catch {
    // If rendered outside AppProvider
  }

  if (logoUrl && !forceDefault) {
    const style = size ? { width: size, height: size } : undefined;
    return (
      <img
        src={logoUrl}
        alt="Logo Pemerintah Kota Banjar"
        className={`${className} object-contain`}
        style={style}
      />
    );
  }

  return <LogoKotaBanjar className={className} size={size} />;
};

// Official Lambang Pemerintah Kota Banjar (Vector SVG Emblem)
export const LogoKotaBanjar: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-14 h-14',
  size,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 120 130"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Shield Gradient */}
        <linearGradient id="banjarShieldBg" x1="0" y1="0" x2="120" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#15803d" />
          <stop offset="0.5" stopColor="#166534" />
          <stop offset="1" stopColor="#14532d" />
        </linearGradient>
        {/* River Gradient */}
        <linearGradient id="citanduyRiver" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        {/* Gold Border */}
        <linearGradient id="banjarGold" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fef08a" />
          <stop offset="0.5" stopColor="#eab308" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
      </defs>

      {/* Outer Shadow / Glow */}
      <polygon
        points="60,3 113,38 97,118 60,127 23,118 7,38"
        fill="#000000"
        opacity="0.15"
      />

      {/* Main Pentagon Shield Border (Gold) */}
      <polygon
        points="60,4 112,38 96,116 60,126 24,116 8,38"
        fill="url(#banjarGold)"
        stroke="#a16207"
        strokeWidth="1.5"
      />

      {/* Inner Green Shield Body */}
      <polygon
        points="60,9 106,40 92,111 60,120 28,111 14,40"
        fill="url(#banjarShieldBg)"
        stroke="#ffffff"
        strokeWidth="1"
      />

      {/* Sky / Upper Horizon (Light Blue/Cyan) */}
      <path
        d="M20 46 L60 14 L100 46 L96 70 L24 70 Z"
        fill="#bae6fd"
        opacity="0.85"
      />

      {/* Mount Babakan (Gunung Babakan) */}
      <path
        d="M28 68 L60 38 L92 68 Z"
        fill="#047857"
      />
      <path
        d="M45 68 L60 45 L78 68 Z"
        fill="#065f46"
      />

      {/* Citanduy River Waves at Bottom */}
      <path
        d="M26 78 C36 74 46 82 60 76 C74 70 84 82 94 76 L92 98 C78 104 68 96 60 100 C50 104 38 96 28 98 Z"
        fill="url(#citanduyRiver)"
      />
      <path
        d="M30 82 C40 79 50 85 60 81 C70 77 80 84 90 80"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M32 89 C42 86 52 92 60 88 C70 84 80 91 88 87"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Bridge Viaduk / Dobo */}
      <rect x="36" y="66" width="48" height="4" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
      <path d="M42 70 L42 77 M54 70 L54 77 M66 70 L66 77 M78 70 L78 77" stroke="#475569" strokeWidth="1.2" />

      {/* Golden Star at top center */}
      <g transform="translate(60, 24) scale(0.9)">
        <polygon
          points="0,-9 2.5,-3 8.5,-2.5 4,2 5.5,8 0,5 -5.5,8 -4,2 -8.5,-2.5 -2.5,-3"
          fill="#fef08a"
          stroke="#ca8a04"
          strokeWidth="0.7"
        />
      </g>

      {/* Traditional Weapon (Kujang Jawa Barat) in Center */}
      <g transform="translate(60, 66) scale(0.85)">
        <path
          d="M-2 -18 C1 -16 6 -12 6 -6 C6 0 2 6 2 12 L-2 12 C-2 7 0 2 0 -4 C0 -9 -3 -12 -3 -14 Z"
          fill="#f59e0b"
          stroke="#78350f"
          strokeWidth="0.8"
        />
        <circle cx="2" cy="-8" r="0.8" fill="#78350f" />
        <circle cx="2" cy="-4" r="0.8" fill="#78350f" />
        <circle cx="2" cy="0" r="0.8" fill="#78350f" />
      </g>

      {/* Padi (Left) */}
      <path
        d="M28 86 C25 72 30 54 40 44"
        stroke="#eab308"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="28" cy="80" r="1.5" fill="#facc15" />
      <circle cx="27" cy="74" r="1.5" fill="#facc15" />
      <circle cx="29" cy="67" r="1.5" fill="#facc15" />
      <circle cx="32" cy="60" r="1.5" fill="#facc15" />
      <circle cx="36" cy="53" r="1.5" fill="#facc15" />
      <circle cx="40" cy="46" r="1.5" fill="#facc15" />

      {/* Kapas (Right) */}
      <path
        d="M92 86 C95 72 90 54 80 44"
        stroke="#15803d"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="92" cy="80" r="2" fill="#ffffff" stroke="#15803d" strokeWidth="0.8" />
      <circle cx="93" cy="73" r="2" fill="#ffffff" stroke="#15803d" strokeWidth="0.8" />
      <circle cx="91" cy="66" r="2" fill="#ffffff" stroke="#15803d" strokeWidth="0.8" />
      <circle cx="87" cy="59" r="2" fill="#ffffff" stroke="#15803d" strokeWidth="0.8" />
      <circle cx="83" cy="52" r="2" fill="#ffffff" stroke="#15803d" strokeWidth="0.8" />
      <circle cx="79" cy="46" r="2" fill="#ffffff" stroke="#15803d" strokeWidth="0.8" />

      {/* Top Banner: "KOTA BANJAR" */}
      <g transform="translate(60, 36)">
        <path
          d="M-36 -4 L36 -4 L32 6 L-32 6 Z"
          fill="#dc2626"
          stroke="#991b1b"
          strokeWidth="0.7"
        />
        <text
          x="0"
          y="3.5"
          fill="#ffffff"
          fontSize="5.5"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
          letterSpacing="0.8"
        >
          KOTA BANJAR
        </text>
      </g>

      {/* Bottom Motto Ribbon: "SOMAHNA BAGJA DI BUANA" */}
      <g transform="translate(60, 114)">
        <path
          d="M-42 -4 L42 -4 L38 6 L-38 6 Z"
          fill="#fef08a"
          stroke="#ca8a04"
          strokeWidth="0.8"
        />
        <text
          x="0"
          y="3"
          fill="#78350f"
          fontSize="4"
          fontWeight="800"
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
          letterSpacing="0.4"
        >
          SOMAHNA BAGJA DI BUANA
        </text>
      </g>
    </svg>
  );
};
