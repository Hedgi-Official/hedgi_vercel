// Skyline.tsx
export function Skyline() {
  return (
    <div className="w-full h-20 sm:h-24 mt-1 mb-4">
      <svg
        viewBox="0 0 800 100"
        className="block w-full h-full text-foreground/10"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M0 100V70h30V50h20v20h30V30h20v40h30V50h20V30h20v20h30V30h20v40h30V50h20V30h20v20h30V30h20v40h30V50h20V30h20v20h30V30h20v40h30V50h30V50h20v20h30V50h20v20h30V30h30V30h20v20h30V40h20v30h30V50h20v20h30V40h20v60h100v40z"
        />
      </svg>
    </div>
  );
}
