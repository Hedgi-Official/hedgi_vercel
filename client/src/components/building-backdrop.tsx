import React from 'react';

export function BuildingBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        className="opacity-[0.03] text-foreground"
      >
        <path
          fill="currentColor"
          d="M1600 0h160v1080h-160zm-320 300h160v780h-160zm-320-100h160v880h-160zm-320 200h160v680h-160zm-320-200h160v880h-160zM0 400h160v680H0z"
        />
        <path
          fill="currentColor"
          d="M1720 400h40v80h-40zm-320-100h40v80h-40zm-320 100h40v80h-40zm-320-100h40v80h-40zm-320 100h40v80h-40zM120 300h40v80h-40z"
        />
      </svg>
    </div>
  );
}
