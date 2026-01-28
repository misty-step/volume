import { WeightUnit } from "./types";

/**
 * Official conversion factor: 1 kilogram = 2.20462 pounds
 *
 * Rounded to 5 decimal places for UI display accuracy.
 * Source: International System of Units (SI)
 *
 * @example
 * 100 kg × 2.20462 = 220.462 lbs
 * 220 lbs ÷ 2.20462 = 99.79 kg
 */
export const LBS_PER_KG = 2.20462;

/**
 * Convert weight from one unit to another.
 * @param weight - Weight value to convert
 * @param fromUnit - Source unit ("lbs" or "kg")
 * @param toUnit - Target unit ("lbs" or "kg")
 * @returns Converted weight value
 */
export function convertWeight(
  weight: number,
  fromUnit: WeightUnit,
  toUnit: WeightUnit
): number {
  if (fromUnit === toUnit) return weight;

  // Convert lbs to kg: divide by conversion factor
  if (fromUnit === "lbs" && toUnit === "kg") {
    return weight / LBS_PER_KG;
  }

  // Convert kg to lbs: multiply by conversion factor
  if (fromUnit === "kg" && toUnit === "lbs") {
    return weight * LBS_PER_KG;
  }

  // Unknown units, return as-is
  return weight;
}

/**
 * Normalize weight unit to a valid WeightUnit type.
 * Validates and returns "lbs" or "kg", with "lbs" as fallback for invalid units.
 * @param unit - Unit string to normalize
 * @returns Valid WeightUnit ("lbs" or "kg")
 */
export function normalizeWeightUnit(unit?: string): WeightUnit {
  return unit === "lbs" || unit === "kg" ? unit : "lbs";
}
