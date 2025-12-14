// scripts/generate_recipes.js
const fs = require('fs');
const path = require('path');

/* ---------- HELPERS ---------- */
const uid = (c, i) => `${c}-${i}`;

function ing(name, qty, unit) {
  return { name, qty, unit };
}

/* ---------- BASE DATA ---------- */
const INDIAN_BASE = [
  ['Aloo Paratha', 320, [ing('Wheat Flour',200,'g'), ing('Potato',2,'count'), ing('Oil',15,'ml')]],
  ['Dal Tadka', 280, [ing('Toor Dal',150,'g'), ing('Onion',1,'count'), ing('Oil',10,'ml')]],
  ['Paneer Bhurji', 350, [ing('Paneer',200,'g'), ing('Onion',1,'count'), ing('Oil',10,'ml')]],
  ['Jeera Rice', 240, [ing('Rice',200,'g'), ing('Oil',10,'ml')]],
  ['Curd Rice', 260, [ing('Rice',150,'g'), ing('Curd',100,'g')]],
];

const GLOBAL_BASE = [
  ['Pasta Alfredo', 420, [ing('Pasta',200,'g'), ing('Milk',100,'ml')]],
  ['Omelette', 250, [ing('Egg',2,'count'), ing('Oil',5,'ml')]],
  ['Grilled Sandwich', 300, [ing('Bread',2,'count'), ing('Oil',5,'ml')]],
  ['Tomato Soup', 180, [ing('Tomato',3,'count')]],
];

/* ---------- GENERATE ---------- */
const RECIPES = [];

// 100 Indian
for (let i = 0; i < 100; i++) {
  const b = INDIAN_BASE[i % INDIAN_BASE.length];
  RECIPES.push({
    id: uid('indian', i + 1),
    title: b[0],
    cuisine: 'Indian',
    difficulty: i % 2 === 0 ? 'Easy' : 'Medium',
    servings: 2,
    nutrition: { kcal: b[1] },
    ingredients: b[2],
    steps: ['Prep ingredients', 'Cook', 'Serve hot']
  });
}

// 50 Global
for (let i = 0; i < 50; i++) {
  const b = GLOBAL_BASE[i % GLOBAL_BASE.length];
  RECIPES.push({
    id: uid('global', i + 1),
    title: b[0],
    cuisine: 'Global',
    difficulty: i % 2 === 0 ? 'Easy' : 'Medium',
    servings: 2,
    nutrition: { kcal: b[1] },
    ingredients: b[2],
    steps: ['Prepare', 'Cook', 'Serve']
  });
}

/* ---------- WRITE ---------- */
const outPath = path.join(process.cwd(), 'src/data/recipes.json');
fs.writeFileSync(outPath, JSON.stringify(RECIPES, null, 2));

console.log(`✅ ${RECIPES.length} recipes written`);
console.log(`📁 ${outPath}`);
