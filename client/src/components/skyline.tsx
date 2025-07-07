export function Skyline() {
  return (
    <div className="h-24 mt-4 mb-8 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen sm:relative sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full">
      <svg
        viewBox="0 0 800 100"
        className="w-full h-full text-foreground/10 px-4 sm:px-0"
        preserveAspectRatio="xMidYMax meet"
      >
        <path
          fill="currentColor"
          d="M0 100V70h30V50h20v20h30V30h20v40h30V50h20V30h20v20h30V30h20v40h30V50h20V30h20v20h30V30h20v40h30V50h20V30h20v20h30V30h20v40h30V50h20v20h30V40h20v30h30V50h20v20h30V40h20v60z"
        />
      </svg>
    </div>
  );
}
