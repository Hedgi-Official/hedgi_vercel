import React from 'react';

export function BuildingBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        className="opacity-[0.03] text-foreground"
      >
        {/* Background buildings */}
        <path
          fill="currentColor"
          d="M0 1080V400 L200 100 L400 300 L600 50 L800 200 L1000 0 L1200 150 L1400 50 L1600 250 L1800 100 L1920 300 V1080z"
        />

        {/* Foreground buildings with windows */}
        <g>
          {/* Left building */}
          <path
            fill="currentColor"
            d="M100 1080V500 L300 400 L500 500 V1080z"
          />
          {/* Windows */}
          <g fill="currentColor" opacity="0.5">
            {Array.from({length: 10}, (_, i) => (
              <rect key={`left-${i}`} x="150" y={550 + i * 50} width="20" height="30"/>
            ))}
            {Array.from({length: 10}, (_, i) => (
              <rect key={`left-mid-${i}`} x="250" y={550 + i * 50} width="20" height="30"/>
            ))}
          </g>

          {/* Center building */}
          <path
            fill="currentColor"
            d="M700 1080V300 L900 200 L1100 300 V1080z"
          />
          {/* Windows */}
          <g fill="currentColor" opacity="0.5">
            {Array.from({length: 15}, (_, i) => (
              <rect key={`center-${i}`} x="750" y={350 + i * 50} width="20" height="30"/>
            ))}
            {Array.from({length: 15}, (_, i) => (
              <rect key={`center-mid-${i}`} x="850" y={350 + i * 50} width="20" height="30"/>
            ))}
          </g>

          {/* Right building */}
          <path
            fill="currentColor"
            d="M1300 1080V400 L1500 300 L1700 400 V1080z"
          />
          {/* Windows */}
          <g fill="currentColor" opacity="0.5">
            {Array.from({length: 12}, (_, i) => (
              <rect key={`right-${i}`} x="1350" y={450 + i * 50} width="20" height="30"/>
            ))}
            {Array.from({length: 12}, (_, i) => (
              <rect key={`right-mid-${i}`} x="1450" y={450 + i * 50} width="20" height="30"/>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}