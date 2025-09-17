// scripts/generate_recipes.js
const fs = require('fs');
const path = require('path');

const RECIPES = [];

// --- Example starter recipes ---
RECIPES.push({
  id: 'indian-1',
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
    'Mix with spices',
    'Roll with flour into paratha',
    'Cook on tawa with oil'
  ],
  nutrition: { kcal: 350, protein: 8, carbs: 60, fat: 10 }
});

// TODO: add more 100 Indian + 50 Global recipes here automatically

// --- Write file ---
const outPath = path.join(__dirname, '../src/data/recipes.json');
fs.writeFileSync(outPath, JSON.stringify(RECIPES, null, 2));
console.log(`✅ Recipes written to ${outPath}`);
