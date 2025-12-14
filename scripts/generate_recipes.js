// scripts/generate_recipes.js
const fs = require('fs');
const path = require('path');

/**
 * Helper to create safe, unique IDs
 */
function makeId(title, index) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')   // replace spaces & symbols with -
      .replace(/(^-|-$)/g, '')      // trim -
    + '-' + index                   // ensure uniqueness
  );
}

const RECIPES = [];

/* ---------------- INDIAN RECIPES ---------------- */

RECIPES.push({
  title: 'Aloo Paratha',
  cuisine: 'Indian',
  servings: 2,
  ingredients: [
    { name: 'Wheat Flour', qty: 200, unit: 'g' },
    { name: 'Potato', qty: 2, unit: 'count' },
    { name: 'Oil', qty: 10, unit: 'ml' }
  ],
  steps: [
    'Boil and mash potatoes',
    'Mix potatoes with spices',
    'Prepare dough with flour',
    'Stuff, roll, and cook on tawa'
  ],
  nutrition: { kcal: 350, protein: 8, carbs: 60, fat: 10 }
});

RECIPES.push({
  title: 'Boondi Raita',
  cuisine: 'Indian',
  servings: 2,
  ingredients: [
    { name: 'Curd', qty: 200, unit: 'g' },
    { name: 'Boondi', qty: 50, unit: 'g' }
  ],
  steps: [
    'Whisk curd',
    'Add soaked boondi',
    'Season and serve'
  ],
  nutrition: { kcal: 180, protein: 6, carbs: 12, fat: 8 }
});

/* ---------------- GLOBAL RECIPES ---------------- */

RECIPES.push({
  title: 'Scrambled Eggs',
  cuisine: 'Global',
  servings: 1,
  ingredients: [
    { name: 'Eggs', qty: 2, unit: 'count' },
    { name: 'Butter', qty: 5, unit: 'g' }
  ],
  steps: [
    'Beat eggs',
    'Cook gently in butter',
    'Season and serve'
  ],
  nutrition: { kcal: 220, protein: 12, carbs: 2, fat: 18 }
});

/* ---------------- ID ASSIGNMENT (CRITICAL FIX) ---------------- */

const FINAL_RECIPES = RECIPES.map((recipe, index) => ({
  ...recipe,
  id: makeId(recipe.title, index)
}));

/* ---------------- WRITE FILE ---------------- */

const outPath = path.join(__dirname, '../src/data/recipes.json');
fs.writeFileSync(outPath, JSON.stringify(FINAL_RECIPES, null, 2));

console.log(`✅ ${FINAL_RECIPES.length} recipes written with unique IDs`);
console.log(`📁 ${outPath}`);
