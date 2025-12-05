import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detect if the current viewport is mobile-sized
 * @returns true if viewport width is less than 768px (md breakpoint)
 */
export function isMobile(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}
