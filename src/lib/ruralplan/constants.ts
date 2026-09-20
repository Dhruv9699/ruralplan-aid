/**
 * Fixed Application Constants for RuralPlan AI MVP
 * 
 * These are the 5 supported pickle products that are ALWAYS available
 * in the application for recipes and production planning.
 * 
 * IMPORTANT: These are NOT the same as user business data.
 * A new user with no data has 0 products in their business,
 * but still has access to these 5 recipes and can plan production for them.
 */

/**
 * The 5 fixed pickle products supported by RuralPlan AI.
 * These names MUST match exactly with PRODUCT_RECIPES.
 */
export const FIXED_PICKLE_NAMES = [
  "Mango Pickle",
  "Lemon Pickle",
  "Amla Pickle",
  "Mixed Pickle",
  "Chilli Pickle",
] as const;

export type FixedPickleName = typeof FIXED_PICKLE_NAMES[number];

/**
 * Check if a product name is one of the supported fixed pickles
 */
export function isFixedPickle(productName: string): boolean {
  return FIXED_PICKLE_NAMES.some(
    (name) => name.toLowerCase() === productName.toLowerCase()
  );
}

/**
 * Get the default pickle name (first in list)
 */
export function getDefaultPickleName(): FixedPickleName {
  return FIXED_PICKLE_NAMES[0];
}
