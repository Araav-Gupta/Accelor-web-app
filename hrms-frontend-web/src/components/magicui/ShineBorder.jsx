import React from "react";
import { cn } from "../lib/utils";

export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor = "#000000",
  className,
  //style,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        "relative w-full max-w-md", // Ensure it inherits the width constraints
        className,
      )}
      {...props}
    >
      {/* Border layer with shine effect */}
      <div
        style={{
          "--border-width": `${borderWidth}px`,
          "--duration": `${duration}s`,
          backgroundImage: `radial-gradient(transparent,transparent, ${
            Array.isArray(shineColor) ? shineColor.join(",") : shineColor
          },transparent,transparent)`,
          backgroundSize: "300% 300%",
          mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "var(--border-width)",
          position: "absolute",
          inset: 0,
          zIndex: 0,
        }}
        className="pointer-events-none size-full rounded-[inherit] will-change-[background-position] motion-safe:animate-shine"
      />
      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}