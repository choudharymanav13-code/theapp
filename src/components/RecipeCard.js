// src/components/RecipeCard.js
import Link from 'next/link';

export default function RecipeCard({ recipe, onCook }) {
  const kcal = recipe.nutrition?.kcal ?? '—';
  return (
    <div className="recipe-card card">
      <div className="thumb" aria-hidden />
      <div className="rc-body">
        <div className="rc-title">{recipe.title}</div>
        <div className="small rc-meta">{recipe.cuisine} • Serves {recipe.servings} • {kcal} kcal</div>
      </div>
      <div className="rc-right">
        <div className="rc-match">{recipe.match_count ?? 0}/{recipe.required_count ?? recipe.ingredients.length}</div>
        <Link href={`/recipes/${recipe.id}`} className="btn">View</Link>
        <button className="btn" onClick={() => onCook && onCook(recipe)}>Cook Now</button>
      </div>
    </div>
  );
}
