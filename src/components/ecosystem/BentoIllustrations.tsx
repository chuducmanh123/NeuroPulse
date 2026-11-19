import React from "react";

export function NeuroPulseIllustration() {
  return (
    <svg viewBox="0 0 330 160" className="ink-draw h-32 w-auto sm:h-40" fill="none">
      {/* Fine Scientific Baseline & Rhythm Trace */}
      <line
        x1="12"
        y1="84"
        x2="176"
        y2="84"
        stroke="#B91C1C"
        strokeOpacity="0.24"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <path
        d="M12 84 H38 L44 74 L50 93 L57 62 L65 112 L74 26 L84 126 L93 54 L100 94 L107 79 L114 84 H158"
        stroke="#B91C1C"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="158" cy="84" r="2.6" fill="#B91C1C" />
      {/* Netter-Style Multipolar Neuron Engraving */}
      <g stroke="#B91C1C" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M214 54 C226 42, 244 45, 252 57 C261 70, 255 89, 241 95 C227 101, 211 92, 208 78 C206 68, 208 60, 214 54 Z"
          fill="#B91C1C"
          fillOpacity="0.1"
          strokeWidth="1.9"
        />
        <circle cx="231" cy="72" r="9.5" fill="#B91C1C" fillOpacity="0.18" strokeWidth="1.4" />
        <circle cx="233" cy="70" r="3" fill="#B91C1C" />
        <circle cx="217" cy="63" r="1.1" fill="#B91C1C" />
        <circle cx="222" cy="56" r="0.9" fill="#B91C1C" />
        <circle cx="242" cy="60" r="1.1" fill="#B91C1C" />
        <circle cx="246" cy="75" r="1" fill="#B91C1C" />
        <circle cx="220" cy="83" r="1.1" fill="#B91C1C" />
        <circle cx="235" cy="86" r="0.9" fill="#B91C1C" />
        <circle cx="214" cy="73" r="0.8" fill="#B91C1C" />
        <circle cx="243" cy="84" r="0.9" fill="#B91C1C" />
        <path
          d="M214 55 L193 38 M193 38 L178 34 M193 38 L188 22 M178 34 L168 25 M178 34 L167 41 M188 22 L180 14"
          strokeWidth="1.45"
        />
        <path
          d="M236 46 L251 25 M251 25 L267 20 M251 25 L249 11 M267 20 L277 12 M267 20 L276 28"
          strokeWidth="1.45"
        />
        <path
          d="M253 64 L280 55 M280 55 L296 47 M280 55 L295 65 M296 47 L308 41 M295 65 L307 71"
          strokeWidth="1.45"
        />
        <path
          d="M208 79 L183 91 M183 91 L166 89 M183 91 L174 106 M166 89 L155 96 M174 106 L165 114"
          strokeWidth="1.45"
        />
        <path
          d="M219 94 L199 114 M199 114 L184 121 M199 114 L196 129 M184 121 L175 130"
          strokeWidth="1.35"
        />
        <path d="M239 95 C247 111, 260 127, 281 144" strokeWidth="1.8" />
        <rect
          x="240"
          y="101"
          width="15"
          height="7"
          rx="3.5"
          transform="rotate(44 240 101)"
          className="fill-[var(--bg-paper)]"
          strokeWidth="1.45"
        />
        <rect
          x="255"
          y="116"
          width="15"
          height="7"
          rx="3.5"
          transform="rotate(44 255 116)"
          className="fill-[var(--bg-paper)]"
          strokeWidth="1.45"
        />
        <path d="M281 144 L294 140 M281 144 L288 154 M281 144 L273 153" strokeWidth="1.4" />
        <circle cx="295" cy="140" r="1.8" fill="#B91C1C" />
        <circle cx="288" cy="154" r="1.8" fill="#B91C1C" />
        <circle cx="273" cy="153" r="1.8" fill="#B91C1C" />
      </g>
    </svg>
  );
}

export function NeuroCaseIllustration() {
  return (
    <svg
      viewBox="0 0 330 160"
      className="ink-draw h-32 w-auto sm:h-40"
      fill="none"
      stroke="#6D28D9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Antique Glass Edison Bulb */}
      <path
        d="M106 42 C86 42, 72 56, 72 74 C72 86, 79 95, 88 101 C92 104, 93 109, 93 114 H119 C119 109, 120 104, 124 101 C133 95, 140 86, 140 74 C140 56, 126 42, 106 42 Z"
        fill="#6D28D9"
        fillOpacity="0.1"
        strokeWidth="2"
      />
      <path d="M95 114 H117 M96 120 H116 M98 126 H114 M101 132 H111" strokeWidth="1.8" />
      <path
        d="M100 114 V87 L94 78 L100 73 L106 79 L112 73 L118 78 L112 87 V114"
        strokeWidth="1.45"
      />
      <path
        d="M106 18 V31 M64 33 L73 42 M148 33 L139 42 M48 72 H61 M151 72 H164 M64 110 L73 101"
        strokeWidth="1.6"
      />
      <circle cx="83" cy="67" r="1" fill="#6D28D9" />
      <circle cx="87" cy="58" r="0.9" fill="#6D28D9" />
      <circle cx="127" cy="65" r="1" fill="#6D28D9" />
      <circle cx="123" cy="80" r="0.9" fill="#6D28D9" />
      <circle cx="86" cy="84" r="0.8" fill="#6D28D9" />
      <circle cx="125" cy="55" r="0.8" fill="#6D28D9" />
      {/* Clinical Case Clipboard with Topographic Cortex Map */}
      <g transform="rotate(6 214 84)">
        <rect
          x="172"
          y="32"
          width="84"
          height="108"
          rx="8"
          fill="#6D28D9"
          fillOpacity="0.08"
          strokeWidth="2"
        />
        <rect
          x="180"
          y="41"
          width="68"
          height="90"
          rx="3.5"
          className="fill-[var(--bg-paper)]"
          strokeWidth="1.2"
        />
        <path d="M198 27 H230 V38 H198 Z" className="fill-[var(--bg-paper)]" strokeWidth="1.8" />
        <circle cx="214" cy="32.5" r="2" fill="#6D28D9" />
        <path
          d="M214 51 C199 50, 189 60, 190 71 C191 81, 200 86, 212 86 H216 C228 86, 237 81, 238 71 C239 60, 229 50, 214 51 Z"
          fill="#6D28D9"
          fillOpacity="0.14"
          strokeWidth="1.5"
        />
        <path
          d="M214 51 V86 M200 63 C204 61, 209 63, 211 66 M217 66 C219 63, 224 61, 228 63 M199 75 C204 73, 208 75, 211 78 M217 78 C220 75, 224 73, 229 75"
          strokeWidth="1.25"
        />
        <path d="M189 98 H239 M189 107 H233 M189 116 H224 M189 124 H212" strokeWidth="1.45" />
      </g>
    </svg>
  );
}

export function NeuroCalcIllustration() {
  return (
    <svg
      viewBox="0 0 330 160"
      className="ink-draw h-32 w-auto sm:h-40"
      fill="none"
      stroke="#B45309"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Precision Engraved Vernier Caliper */}
      <g transform="rotate(-15 162 66)">
        <rect
          x="46"
          y="48"
          width="226"
          height="16"
          rx="2.5"
          fill="#B45309"
          fillOpacity="0.1"
          strokeWidth="1.9"
        />
        <path
          d="M46 48 V20 L60 31 V48 M46 64 V106 L62 91 V64"
          fill="#B45309"
          fillOpacity="0.16"
          strokeWidth="1.9"
        />
        <path d="M108 43 H142 V69 H108 Z" className="fill-[var(--bg-paper)]" strokeWidth="1.9" />
        <path
          d="M116 43 V23 L127 32 V43 M116 69 V102 L129 89 V69"
          fill="#B45309"
          fillOpacity="0.16"
          strokeWidth="1.8"
        />
        <circle cx="125" cy="38" r="2.5" fill="#B45309" />
        <rect x="113" y="51" width="24" height="10" rx="1" strokeWidth="1.1" />
        <path
          d="M68 48 V54 M78 48 V56 M88 48 V54 M98 48 V56 M148 48 V54 M158 48 V56 M168 48 V54 M178 48 V56 M188 48 V54 M198 48 V56 M208 48 V54 M218 48 V56 M228 48 V54 M238 48 V56 M248 48 V54 M258 48 V56"
          strokeWidth="1.2"
        />
      </g>
      {/* Graduated Clinical Drafting Ruler */}
      <rect
        x="92"
        y="112"
        width="164"
        height="24"
        rx="3"
        fill="#B45309"
        fillOpacity="0.08"
        strokeWidth="1.8"
      />
      <path
        d="M104 112 V121 M114 112 V117 M124 112 V120 M134 112 V117 M144 112 V122 M154 112 V117 M164 112 V120 M174 112 V117 M184 112 V122 M194 112 V117 M204 112 V120 M214 112 V117 M224 112 V122 M234 112 V117 M244 112 V121"
        strokeWidth="1.25"
      />
      <text x="101" y="131" fill="#B45309" fontFamily="monospace" fontSize="8.5" fontWeight="bold" stroke="none">
        0
      </text>
      <text x="160" y="131" fill="#B45309" fontFamily="monospace" fontSize="8.5" fontWeight="bold" stroke="none">
        15
      </text>
      <text x="234" y="131" fill="#B45309" fontFamily="monospace" fontSize="8.5" fontWeight="bold" stroke="none">
        30
      </text>
    </svg>
  );
}

export function NeuroVisionIllustration() {
  return (
    <svg
      viewBox="0 0 330 160"
      className="ink-draw h-32 w-auto sm:h-40"
      fill="none"
      stroke="#1D4ED8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Axial Brain MRI Cross-Section */}
      <ellipse cx="104" cy="80" rx="46" ry="56" fill="#1D4ED8" fillOpacity="0.08" strokeWidth="2" />
      <ellipse cx="104" cy="80" rx="38" ry="48" strokeWidth="1.35" />
      <path d="M104 33 V127" strokeWidth="1.35" />
      <path d="M93 52 C98 48, 110 48, 115 52" strokeWidth="2" />
      <path
        d="M96 59 C88 64, 88 94, 96 100 C100 90, 100 68, 96 59 Z"
        fill="#1D4ED8"
        fillOpacity="0.25"
        strokeWidth="1.5"
      />
      <path
        d="M112 59 C120 64, 120 94, 112 100 C108 90, 108 68, 112 59 Z"
        fill="#1D4ED8"
        fillOpacity="0.25"
        strokeWidth="1.5"
      />
      <ellipse cx="83" cy="80" rx="5.5" ry="11" fill="#1D4ED8" fillOpacity="0.14" strokeWidth="1.2" />
      <ellipse cx="125" cy="80" rx="5.5" ry="11" fill="#1D4ED8" fillOpacity="0.14" strokeWidth="1.2" />
      <path
        d="M77 54 C83 56, 85 62, 79 66 M131 54 C125 56, 123 62, 129 66 M75 91 C82 90, 84 97, 78 102 M133 91 C126 90, 124 97, 130 102 M87 42 C92 45, 92 50, 87 52 M121 42 C116 45, 116 50, 121 52"
        strokeWidth="1.35"
      />
      {/* Fine Anatomical Human Eye Engraving */}
      <path
        d="M170 88 C191 59, 240 59, 263 88 C240 117, 191 117, 170 88 Z"
        fill="#1D4ED8"
        fillOpacity="0.07"
        strokeWidth="2"
      />
      <path d="M176 79 C195 56, 238 56, 257 79" strokeWidth="1.35" />
      <path d="M185 69 L180 61 M200 63 L197 54 M216 61 L216 52 M233 63 L236 54 M248 69 L253 61" strokeWidth="1.45" />
      <circle cx="216" cy="88" r="18" fill="#1D4ED8" fillOpacity="0.16" strokeWidth="1.8" />
      <path
        d="M216 71 V76 M216 100 V105 M199 88 H204 M228 88 H233 M204 76 L208 80 M224 96 L228 100 M228 76 L224 80 M208 96 L204 100"
        strokeWidth="1.25"
      />
      <circle cx="216" cy="88" r="8" fill="#1D4ED8" />
      <circle cx="212" cy="84" r="2.6" fill="#FFFFFF" stroke="none" />
    </svg>
  );
}

export function NeuroGuideIllustration() {
  return (
    <svg
      viewBox="0 0 330 160"
      className="ink-draw h-32 w-auto sm:h-40"
      fill="none"
      stroke="#C25934"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Lateral Cerebral Hemisphere, Cerebellum & Brainstem */}
      <path
        d="M126 37 C98 34, 73 52, 71 78 C69 97, 81 112, 102 114 L115 134 H130 L128 114 C143 113, 155 103, 160 90"
        fill="#C25934"
        fillOpacity="0.1"
        strokeWidth="2"
      />
      <path
        d="M128 95 C139 93, 150 98, 149 108 C148 115, 137 119, 128 115"
        fill="#C25934"
        fillOpacity="0.18"
        strokeWidth="1.6"
      />
      <path d="M130 101 H147 M130 107 H145" strokeWidth="1.25" />
      <path
        d="M88 59 C98 54, 111 58, 116 68 M81 78 C94 74, 107 79, 112 89 M98 44 C107 46, 114 51, 117 57 M88 97 C99 95, 109 98, 114 105 M118 46 C127 48, 133 54, 135 62"
        strokeWidth="1.45"
      />
      {/* Open Hardcover Clinical Compendium */}
      <path d="M152 65 L202 52 V118 L152 131 Z" className="fill-[var(--bg-paper)]" strokeWidth="2" />
      <path d="M252 65 L202 52 V118 L252 131 Z" fill="#C25934" fillOpacity="0.09" strokeWidth="2" />
      <path d="M148 68 V134 L202 121 L256 134 V68" strokeWidth="1.3" />
      <ellipse cx="177" cy="79" rx="12" ry="8.5" fill="#C25934" fillOpacity="0.15" strokeWidth="1.35" />
      <path d="M177 70.5 V87.5 M161 97 L193 89 M161 107 L193 99 M161 117 L193 109" strokeWidth="1.35" />
      <path d="M211 69 L243 77 M211 79 L243 87 M211 89 L243 97 M211 99 L243 107 M211 109 L235 115" strokeWidth="1.35" />
    </svg>
  );
}

export function NeuroRxIllustration() {
  return (
    <svg
      viewBox="0 0 330 160"
      className="ink-draw h-32 w-auto sm:h-40"
      fill="none"
      stroke="#2F855A"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Graduated Erlenmeyer Flask */}
      <path
        d="M84 34 H108 M90 34 V59 L64 116 C61 122, 65 129, 73 129 H119 C127 129, 131 122, 128 116 L102 59 V34"
        fill="#2F855A"
        fillOpacity="0.09"
        strokeWidth="2"
      />
      <path d="M72 99 C85 103, 107 103, 120 99" strokeWidth="1.65" />
      <path d="M84 75 H93 M80 88 H91 M75 112 H87" strokeWidth="1.35" />
      <circle cx="88" cy="114" r="1.8" fill="#2F855A" />
      <circle cx="104" cy="110" r="1.4" fill="#2F855A" />
      <circle cx="97" cy="120" r="1.2" fill="#2F855A" />
      {/* Molecular Ring */}
      <polygon points="162,45 177,54 177,71 162,80 147,71 147,54" strokeWidth="1.7" />
      <path d="M177 54 L193 45 L208 54 V71 L193 80 L177 71" strokeWidth="1.7" />
      <path d="M162 45 V30 M193 45 V30 M208 54 L222 46 M162 80 L149 89" strokeWidth="1.55" />
      <circle cx="162" cy="30" r="2.2" fill="#2F855A" />
      <circle cx="222" cy="46" r="2.2" fill="#2F855A" />
      {/* Apothecary Mortar & Pestle */}
      <path
        d="M190 95 H256 C256 118, 241 131, 223 131 C205 131, 190 118, 190 95 Z"
        fill="#2F855A"
        fillOpacity="0.13"
        strokeWidth="2"
      />
      <path d="M185 95 H261" strokeWidth="2.1" />
      <path d="M230 95 L252 66 C255 62, 262 65, 258 70 L241 95" strokeWidth="1.9" />
      <circle cx="208" cy="112" r="1.1" fill="#2F855A" />
      <circle cx="222" cy="118" r="1.1" fill="#2F855A" />
      <circle cx="235" cy="110" r="1.1" fill="#2F855A" />
    </svg>
  );
}
