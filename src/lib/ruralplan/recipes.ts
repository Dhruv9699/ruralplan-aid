/**
 * Product Recipe Definitions
 * 
 * This is a TEMPORARY solution until the database schema is updated
 * to support multiple materials per product via a junction table.
 * 
 * Each recipe defines the raw materials needed to produce 1 unit of the product.
 */

export interface RecipeIngredient {
  materialName: string;
  quantityPerUnit: number;
  unit: string;
}

export interface ProductRecipe {
  productName: string;
  description: string;
  ingredients: RecipeIngredient[];
  preparationSteps: string[];
  preparationTimeMinutes: number;
  youtubeUrl: string;
}

/**
 * The 5 standard pickle recipes for RuralPlan AI MVP.
 * These will eventually be stored in the database.
 */
export const PRODUCT_RECIPES: ProductRecipe[] = [
  {
    productName: "Mango Pickle",
    description: "Traditional spicy mango pickle made with raw mangoes, oil, and aromatic spices. Perfect with Indian meals.",
    ingredients: [
      { materialName: "Mango", quantityPerUnit: 0.5, unit: "kg" },
      { materialName: "Oil", quantityPerUnit: 0.15, unit: "litre" },
      { materialName: "Salt", quantityPerUnit: 0.05, unit: "kg" },
      { materialName: "Spices", quantityPerUnit: 0.03, unit: "kg" },
      { materialName: "Jars", quantityPerUnit: 1, unit: "packet" },
    ],
    preparationSteps: [
      "Wash and dry raw mangoes completely",
      "Cut mangoes into small pieces",
      "Mix with salt and keep aside for 2-3 hours",
      "Heat oil and add spices (mustard, fenugreek, turmeric, chili)",
      "Let the oil cool completely",
      "Mix the spiced oil with mango pieces",
      "Store in sterilized jars",
      "Keep in sunlight for 3-4 days",
    ],
    preparationTimeMinutes: 240,
    youtubeUrl: "https://www.youtube.com/watch?v=99Jb2Tj_hW0",
  },
  {
    productName: "Lemon Pickle",
    description: "Tangy and spicy lemon pickle that adds zest to any meal. Made with fresh lemons and traditional spices.",
    ingredients: [
      { materialName: "Lemon", quantityPerUnit: 0.4, unit: "kg" },
      { materialName: "Oil", quantityPerUnit: 0.12, unit: "litre" },
      { materialName: "Salt", quantityPerUnit: 0.04, unit: "kg" },
      { materialName: "Spices", quantityPerUnit: 0.025, unit: "kg" },
      { materialName: "Jars", quantityPerUnit: 1, unit: "packet" },
    ],
    preparationSteps: [
      "Wash and dry lemons thoroughly",
      "Cut lemons into quarters or 8 pieces",
      "Mix with salt and keep in sun for 2-3 days",
      "Heat oil with mustard seeds, fenugreek, and red chili powder",
      "Let spiced oil cool completely",
      "Mix oil with sun-dried lemon pieces",
      "Store in sterilized jars",
      "Ready to eat after 1 week",
    ],
    preparationTimeMinutes: 180,
    youtubeUrl: "https://www.youtube.com/watch?v=y-lVUHR49N0",
  },
  {
    productName: "Amla Pickle",
    description: "Healthy and tangy Indian gooseberry pickle rich in Vitamin C. Great for digestion and immunity.",
    ingredients: [
      { materialName: "Amla", quantityPerUnit: 0.5, unit: "kg" },
      { materialName: "Oil", quantityPerUnit: 0.1, unit: "litre" },
      { materialName: "Salt", quantityPerUnit: 0.03, unit: "kg" },
      { materialName: "Spices", quantityPerUnit: 0.02, unit: "kg" },
      { materialName: "Jars", quantityPerUnit: 1, unit: "packet" },
    ],
    preparationSteps: [
      "Wash and dry amla (Indian gooseberries)",
      "Remove seeds and cut into small pieces",
      "Steam amla pieces for 5-7 minutes",
      "Let them cool and dry",
      "Mix with salt, turmeric, and chili powder",
      "Heat oil with mustard and fenugreek seeds",
      "Pour cooled oil over amla mixture",
      "Store in sterilized jars",
      "Ready after 3-4 days",
    ],
    preparationTimeMinutes: 200,
    youtubeUrl: "https://www.youtube.com/results?search_query=Amla+Pickle+Recipe+Indian",
  },
  {
    productName: "Mixed Pickle",
    description: "A delightful combination of mango, lemon, and amla in one jar. Offers variety in every bite.",
    ingredients: [
      { materialName: "Mango", quantityPerUnit: 0.2, unit: "kg" },
      { materialName: "Lemon", quantityPerUnit: 0.15, unit: "kg" },
      { materialName: "Amla", quantityPerUnit: 0.15, unit: "kg" },
      { materialName: "Oil", quantityPerUnit: 0.15, unit: "litre" },
      { materialName: "Salt", quantityPerUnit: 0.05, unit: "kg" },
      { materialName: "Spices", quantityPerUnit: 0.04, unit: "kg" },
      { materialName: "Jars", quantityPerUnit: 1, unit: "packet" },
    ],
    preparationSteps: [
      "Prepare mango, lemon, and amla separately",
      "Cut all fruits into similar-sized pieces",
      "Mix all fruits with salt",
      "Keep in sun for 2-3 days",
      "Heat oil with mustard, fenugreek, and spices",
      "Let oil cool completely",
      "Mix all ingredients together",
      "Store in sterilized jars",
      "Ready after 5-7 days",
    ],
    preparationTimeMinutes: 270,
    youtubeUrl: "https://www.youtube.com/watch?v=8Vx6WITaYbQ",
  },
  {
    productName: "Chilli Pickle",
    description: "Fiery hot chilli pickle for spice lovers. Made with green chillies and bold flavors.",
    ingredients: [
      { materialName: "Chilli", quantityPerUnit: 0.4, unit: "kg" },
      { materialName: "Oil", quantityPerUnit: 0.12, unit: "litre" },
      { materialName: "Salt", quantityPerUnit: 0.04, unit: "kg" },
      { materialName: "Spices", quantityPerUnit: 0.03, unit: "kg" },
      { materialName: "Jars", quantityPerUnit: 1, unit: "packet" },
    ],
    preparationSteps: [
      "Wash and dry green chillies thoroughly",
      "Slit chillies lengthwise (keep stem intact)",
      "Mix with salt and keep aside for 2 hours",
      "Heat oil with mustard seeds, fenugreek, and turmeric",
      "Add asafoetida and let oil cool",
      "Stuff chillies with spice powder",
      "Pour cooled oil over stuffed chillies",
      "Store in sterilized jars",
      "Ready to eat after 2-3 days",
    ],
    preparationTimeMinutes: 150,
    youtubeUrl: "https://www.youtube.com/results?search_query=Green+Chilli+Pickle+Recipe",
  },
];

/**
 * Get the recipe for a specific product by name.
 */
export function getRecipeForProduct(productName: string): ProductRecipe | undefined {
  return PRODUCT_RECIPES.find(
    (recipe) => recipe.productName.toLowerCase() === productName.toLowerCase()
  );
}

/**
 * Calculate total material requirements for a production batch.
 */
export function calculateMaterialRequirements(
  productName: string,
  quantity: number
): Array<RecipeIngredient & { totalRequired: number }> {
  const recipe = getRecipeForProduct(productName);
  if (!recipe) return [];

  return recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    totalRequired: ingredient.quantityPerUnit * quantity,
  }));
}
