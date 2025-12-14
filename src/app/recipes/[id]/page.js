import fs from 'fs';
import path from 'path';
import Link from 'next/link';

export default function RecipeDetail({ params }) {
  const file = path.join(process.cwd(), 'src/data/recipes.json');
  const recipes = JSON.parse(fs.readFileSync(file, 'utf8'));

  const recipe = recipes.find(r => r.id === params.id);

  if (!recipe) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Recipe not found</h2>
        <Link href="/recipes" className="btn">Back</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Link href="/recipes" className="small">← Back</Link>

      <h1 style={{ marginTop: 8 }}>{recipe.title}</h1>
      <div className="small">{recipe.cuisine} • Serves {recipe.servings}</div>

      <div className="card" style={{ marginTop: 16 }}>
        <strong>Ingredients</strong>
        <ul>
          {recipe.ingredients.map((i, idx) => (
            <li key={idx}>
              {i.name} — {i.qty} {i.unit}
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <strong>Steps</strong>
        <ol>
          {recipe.steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <strong>Nutrition (per serving)</strong>
        <div className="small">
          {recipe.nutrition?.kcal ?? '—'} kcal •
          P {recipe.nutrition?.protein ?? '—'}g •
          C {recipe.nutrition?.carbs ?? '—'}g •
          F {recipe.nutrition?.fat ?? '—'}g
        </div>
      </div>

      <button className="btn primary" disabled style={{ marginTop: 16 }}>
        Cook Now (coming soon)
      </button>
    </div>
  );
}
