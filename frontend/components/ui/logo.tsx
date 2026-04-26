import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  /** "white" renders the mountain white (for dark backgrounds),
   *  "black" renders it black (for light backgrounds) */
  color?: "white" | "black" | string;
}

export function Logo({ className, size = 32, color = "white" }: LogoProps) {
  const fill = color === "white" ? "#F5F5F5" : color === "black" ? "#0A0A0A" : color;
  const bg = color === "white" ? "#0A0A0A" : "#F5F5F5";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 175"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Outer mountain M */}
      <path
        fill={fill}
        d="M0 175 L48 18 L80 82 L100 42 L120 82 L152 18 L200 175 Z"
      />
      {/* Left inner cut */}
      <path
        fill={bg}
        d="M50 175 L80 82 L88 82 L100 158 L66 175 Z"
      />
      {/* Right inner cut */}
      <path
        fill={bg}
        d="M150 175 L120 82 L112 82 L100 158 L134 175 Z"
      />
      {/* Nib body */}
      <path
        fill={bg}
        d="M100 48 L88 82 L100 158 L112 82 Z"
      />
      {/* Nib cap (top rectangle) */}
      <rect x="93" y="40" width="14" height="10" rx="2.5" fill={bg} />
      {/* Nib slit — thin center line */}
      <rect x="99" y="82" width="2" height="76" rx="1" fill={fill} opacity="0.6" />
    </svg>
  );
}
