// Imperial <-> metric conversion.
//
// The calculation engines (mealPlan.ts, cardioCalc.ts) are metric and stay
// metric — Mifflin-St Jeor is defined in kg/cm and the MET-to-kcal formula
// is defined in kg. Changing those would change the numbers.
//
// So the UI collects pounds and feet/inches, and converts HERE, at the
// boundary, immediately before handing values to the engines. Nothing
// downstream of this file ever sees an imperial number.

export const CM_PER_INCH = 2.54;
export const KG_PER_LB = 0.45359237;
export const INCHES_PER_FOOT = 12;

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

/** Feet + inches as a single inch total, e.g. (5, 10) -> 70. */
export function feetInchesToInches(feet: number, inches: number): number {
  return feet * INCHES_PER_FOOT + inches;
}

/** Feet + inches straight to cm, for handing to the metric engines. */
export function feetInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feetInchesToInches(feet, inches));
}
