import { VidSumLogoMark } from "@/components/vidsum-logo-mark";

const LOGO_PX = {
  sm: 24,
  md: 28,
  lg: 32,
  xl: 36,
} as const;

const TEXT_CLASS = {
  sm: "text-sm font-semibold tracking-tight text-white",
  md: "text-[17px] font-semibold tracking-tight text-white",
  lg: "text-xl font-semibold text-white",
  xl: "text-2xl font-semibold text-white",
} as const;

type Props = {
  className?: string;
  size?: keyof typeof LOGO_PX;
  priority?: boolean;
};

/**
 * Brand row: square logo asset + “VidSum” wordmark (same PNG as favicon / app icon).
 */
export function VidSumWordmark({
  className = "",
  size = "md",
  priority = false,
}: Props) {
  const px = LOGO_PX[size];
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-2 ${className}`.trim()}
    >
      <VidSumLogoMark size={px} rounded="lg" priority={priority} />
      <span className={TEXT_CLASS[size]}>VidSum</span>
    </span>
  );
}
