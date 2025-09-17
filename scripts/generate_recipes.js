/**
 * scripts/generate_recipes.js
 *
 * Node script (run with `node scripts/generate_recipes.js`) —
 * reads src/data/fallbackFoods.js shape (we'll require it as a module),
 * constructs 100 Indian + 50 global simple recipes, computes nutrition by summing
 * ingredient macros using fallback foods, and writes src/data/recipes.json.
 *
 * NOTE: run this locally (or in Codespaces) — Vercel won't run it for you.
 */

const fs = require('fs');
const path = require('path');

// load fallback foods (must export FALLBACK_FOODS as in your file)
const fallbackPath = path.join(__dirname, '..', 'src', 'data', 'fallbackFoods.js');
if (!fs.existsSync(fallbackPath)) {
  console.error('Cannot find fallbackFoods.js at', fallbackPath);
  process.exit(1);
}
// We'll require by reading and evaluating since fallbackFoods.js is ESM style export.
// Simpler approach: evaluate file content to get FALLBACK_FOODS variable.
const fallbackSrc = fs.readFileSync(fallbackPath, 'utf8');
// naive eval: wrap in module to extract FALLBACK_FOODS
const mod = { exports: {} };
eval(fallbackSrc + '\nmodule.exports = { CATEGORIES, FALLBACK_FOODS, searchFallbackFoods };');
const { FALLBACK_FOODS } = mod.exports;

// helper: find fallback item by alias/name
function findFallbackByName(name) {
  const q = (name || '').toLowerCase();
  // match alias or name includes
  const found = FALLBACK_FOODS.find(f =>
    f.name.toLowerCase() === q ||
    (f.aliases || []).some(a => a.toLowerCase() === q) ||
    f.name.toLowerCase().includes(q) ||
    (f.aliases || []).some(a => q.includes(a.toLowerCase()))
  );
  if (found) return found;
  // try simpler substring
  return FALLBACK_FOODS.find(f => f.name.toLowerCase().includes(q.split(' ')[0]));
}

// Basic ingredient pools (Indian & Global)
const staples = [
  'Paneer','Curd','Milk','Bread','Egg','Chicken','Fish','Potato','Onion','Tomato',
  'Rice','Wheat Flour','Poha','Toor Dal','Moong Dal','Chana Dal','Urad Dal','Sugar','Salt',
  'Sunflower Oil','Mustard Oil','Ghee','Tea Powder','Coffee'
];

const vegPool = ['Spinach','Okra','Brinjal','Carrot','Cauliflower','Green Chilli','Capsicum','Peas'];
const spicePool = ['Turmeric','Chilli Powder','Cumin','Garam Masala','Coriander Powder'];
const globalPool = ['Pasta','Tomato Sauce','Chicken Breast','Olive Oil','Cheese','Lettuce','Cucumber','Garlic','Basil','Potato'];

function pick(arr, n=1) {
  const out = [];
  const pool = [...arr];
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random()*pool.length);
    out.push(pool.splice(i,1)[0]);
  }
  return out;
}

// convert friendly quantity to grams for some items
function qtyForIngredient(name) {
  const n = (name || '').toLowerCase();
  if (/paneer|cheese|tofu/.test(n)) return { qty: 100, unit: 'g' };
  if (/rice|wheat|flour|dal|poha|oats|sugar|salt/.test(n)) return { qty: 100, unit: 'g' };
  if (/oil|ghee/.test(n)) return { qty: 10, unit: 'g' }; // 10g ~ 1 tbsp
  if (/egg/.test(n)) return { qty: 50, unit: 'g' };
  if (/milk|curd/.test(n)) return { qty: 100, unit: 'ml' };
  return { qty: 100, unit: 'g' };
}

// compute macros from fallback item (kcal_100g etc)
function macrosFor(fb, qty, unit) {
  // assume fb has kcal_100g, protein_100g, carbs_100g, fat_100g
  if (!fb) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  // if unit ml treat as per 100g same (ok approximation)
  const factor = (qty || 0) / 100;
  return {
    kcal: (fb.kcal_100g || 0) * factor,
    protein: (fb.protein_100g || 0) * factor,
    carbs: (fb.carbs_100g || 0) * factor,
    fat: (fb.fat_100g || 0) * factor,
  };
}

// Make a recipe object
let recipes = [];
let id = 1;

function createRecipe(name, cuisine, ingredientsList, stepsArr, servings=2) {
  // ingredientsList: array of {name, qty, unit}
  // compute nutrition
  let tot = { kcal: 0, protein:0, carbs:0, fat:0 };
  const ingredients = [];
  for (const ing of ingredientsList) {
    const fb = findFallbackByName(ing.name);
    const q = ing.qty || qtyForIngredient(ing.name).qty;
    const u = ing.unit || qtyForIngredient(ing.name).unit;
    const m = macrosFor(fb, q, u);
    tot.kcal += m.kcal; tot.protein += m.protein; tot.carbs += m.carbs; tot.fat += m.fat;
    ingredients.push({
      name: ing.name,
      qty: q,
      unit: u,
      calories_per_100g: fb ? fb.kcal_100g : null,
      protein_100g: fb ? fb.protein_100g : null,
      carbs_100g: fb ? fb.carbs_100g : null,
      fat_100g: fb ? fb.fat_100g : null,
      source: fb ? 'fallback' : null
    });
  }
  return {
    id: `recipe-${id++}`,
    title: name,
    cuisine,
    servings,
    ingredients,
    steps: stepsArr,
    nutrition: {
      kcal: Math.round(tot.kcal),
      protein: +(tot.protein).toFixed(1),
      carbs: +(tot.carbs).toFixed(1),
      fat: +(tot.fat).toFixed(1)
    }
  };
}

// Simple recipe templates (Indian)
const indianTemplates = [
  { name: 'Aloo Paratha', core: ['Wheat Flour','Potato','Salt','Ghee'], steps: ['Mix wheat flour with water to make dough', 'Boil and mash potato, add salt & spices, stuff and roll parathas', 'Cook on tawa with ghee until golden'] },
  { name: 'Jeera Rice', core: ['Rice','Ghee','Cumin','Salt'], steps: ['Wash rice, soak 15 min', 'Heat ghee, add cumin, add rice and water, cook until done'] },
  { name: 'Toor Dal Tadka', core: ['Toor Dal','Turmeric','Ghee','Tomato','Onion'], steps: ['Cook dal with turmeric', 'Prepare tadka with ghee, cumin, onion, tomato; mix'] },
  { name: 'Paneer Bhurji', core: ['Paneer','Tomato','Onion','Ghee','Spice'], steps: ['Crumble paneer', 'Sauté onion, tomato, spices, add paneer and cook'] },
  { name: 'Vegetable Pulao', core: ['Rice','Peas','Carrot','Ghee','Spice'], steps: ['Sauté vegetables', 'Add rice and water, cook until done'] },
  { name: 'Chana Masala', core: ['Chana Dal','Tomato','Onion','Spice'], steps: ['Soak/cook chana', 'Sauté onion/tomato/spices, add chana and simmer'] },
  { name: 'Poha Upma', core: ['Poha','Peanut','Onion','Turmeric'], steps: ['Rinse poha', 'Sauté onion/peanut/spices, add poha and mix'] },
  { name: 'Moong Dal Khichdi', core: ['Moong Dal','Rice','Ghee','Turmeric'], steps: ['Cook rice and moong dal together with turmeric and salt'] },
  { name: 'Sambar (veg)', core: ['Toor Dal','Tomato','Mixed Veg','Tamarind','Spice'], steps: ['Cook dal', 'Prepare sambar with veggies and tamarind, mix and simmer'] },
  { name: 'Masala Omelette', core: ['Egg','Onion','Tomato','Oil'], steps: ['Beat eggs with chopped veggies and spices', 'Cook on pan'] },
];

// globalTemplates
const globalTemplates = [
  { name: 'Tomato Pasta', core: ['Pasta','Tomato','Olive Oil','Garlic'], steps: ['Boil pasta', 'Prepare tomato garlic sauce', 'Toss pasta in sauce'] },
  { name: 'Grilled Chicken', core: ['Chicken','Olive Oil','Garlic','Salt'], steps: ['Marinate chicken', 'Grill until cooked'] },
  { name: 'Veg Stir Fry', core: ['Mixed Veg','Soy Sauce','Garlic','Olive Oil'], steps: ['Sauté veg with garlic and soy', 'Serve hot'] },
  { name: 'Cheese Sandwich', core: ['Bread','Cheese','Butter'], steps: ['Assemble sandwich and grill'] },
  { name: 'Mashed Potato', core: ['Potato','Butter','Milk','Salt'], steps: ['Boil potatoes', 'Mash with butter and milk'] },
];

// generate 100 Indian recipes by slight variations
for (let i=0;i<100;i++) {
  const t = indianTemplates[i % indianTemplates.length];
  const extras = pick(vegPool, Math.floor(Math.random()*2)); // 0-1 veg
  const spices = pick(spicePool, 1);
  const core = [...t.core, ...extras, ...spices];
  const ingredientsList = core.map(name => ({ name }));
  const title = `${t.name}${i===0?'':' #'+(i+1)}`; // unique naming
  const steps = t.steps;
  recipes.push(createRecipe(title, 'Indian', ingredientsList, steps, 2));
}

// generate 50 global recipes
for (let i=0;i<50;i++) {
  const t = globalTemplates[i % globalTemplates.length];
  const extras = pick(globalPool, Math.floor(Math.random()*2));
  const core = [...t.core, ...extras];
  const ingredientsList = core.map(name => ({ name }));
  const title = `${t.name}${i===0?'':' #'+(i+1)}`;
  recipes.push(createRecipe(title, 'Global', ingredientsList, t.steps, 2));
}

// write file
const outPath = path.join(__dirname, '..', 'src', 'data', 'recipes.json');
fs.writeFileSync(outPath, JSON.stringify(recipes, null, 2), 'utf8');
console.log('Wrote', recipes.length, 'recipes to', outPath);
