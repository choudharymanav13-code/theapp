// scripts/generate_recipes.js
const fs = require('fs');
const path = require('path');

/* ------------------ HELPERS ------------------ */
const uid = (c, i) => `${c.toLowerCase()}-${i}`;

const ING = {
  flour: { name: 'Wheat Flour', unit: 'g' },
  rice: { name: 'Rice', unit: 'g' },
  potato: { name: 'Potato', unit: 'count' },
  onion: { name: 'Onion', unit: 'count' },
  tomato: { name: 'Tomato', unit: 'count' },
  oil: { name: 'Oil', unit: 'ml' },
  milk: { name: 'Milk', unit: 'ml' },
  curd: { name: 'Curd', unit: 'g' },
  paneer: { name: 'Paneer', unit: 'g' },
  dal: { name: 'Toor Dal', unit: 'g' },
  pasta: { name: 'Pasta', unit: 'g' },
  bread: { name: 'Bread', unit: 'count' },
  egg: { name: 'Egg', unit: 'count' }
};

function ing(key, qty) {
  return { name: ING[key].name, qty, unit: ING[key].unit };
}

/* ------------------ INDIAN RECIPES ------------------ */
const INDIAN = [
  ['Aloo Paratha', 2, 320, [ing('flour',200), ing('potato',2), ing('oil',15)]],
  ['Dal Tadka', 3, 280, [ing('dal',150), ing('onion',1), ing('oil',10)]],
  ['Paneer Bhurji', 2, 350, [ing('paneer',200), ing('onion',1), ing('oil',10)]],
  ['Jeera Rice', 3, 240, [ing('rice',200), ing('oil',10)]],
  ['Curd Rice', 2, 260, [ing('rice',150), ing('curd',100)]],
];

const indianRecipes = [];
for (let i = 0; i < 100; i++) {
  const base = INDIAN[i % INDIAN.length];
  indianRecipes.push({
    id: uid('indian', i + 1),
    title: base[0],
    cuisine: 'Indian',
    difficulty: i % 2 === 0 ? 'Easy' : 'Medium',
    servings: base[1],
    nutrition: { kcal: base[2] },
    ingredients: base[3],
    steps: [
      'Prepare ingredients',
      'Cook according to recipe',
      'Serve hot'
    ]
  });
}

/* ------------------ GLOBAL RECIPES ------------------ */
const GLOBAL = [
  ['Pasta Alfredo', 2, 420, [ing('pasta',200), ing('milk',100)]],
  ['Omelette', 1, 250, [ing('egg',2), ing('oil',5)]],
  ['Grilled Sandwich', 1, 300, [ing('bread',2), ing('oil',5)]],
  ['Tomato Soup', 2, 180, [ing('tomato',3)]],
];

const globalRecipes = [];
for (let i = 0; i < 50; i++) {
  const base = GLOBAL[i % GLOBAL.length];
  globalRecipes.push({
    id: uid('global', i + 1),
    title: base[0],
    cuisine: 'Global',
    difficulty: i % 2 === 0 ? 'Easy' : 'Medium',
    servings: base[1],
    nutrition: { kcal: base[2] },
    ingredients: base[3],
    steps: [
      'Prep ingredients',
      'Cook as instructed',
      'Serve warm'
    ]
  });
}

/* ------------------ WRITE FILE ------------------ */
const ALL = [...indianRecipes, ...globalRecipes];

const outPath = path.join(process.cwd(), 'src', 'data', 'recipes.json');
fs.writeFileSync(outPath, JSON.stringify(ALL, null, 2));

console.log(`✅ ${ALL.length} recipes written`);
console.log(`📁 ${outPath}`);
