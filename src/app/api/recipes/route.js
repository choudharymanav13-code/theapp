// src/app/api/recipes/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q")?.toLowerCase() || "";
  const cuisine = searchParams.get("cuisine")?.toLowerCase() || "";
  const calories = searchParams.get("calories");
  const suggest = searchParams.get("suggest") === "true";

  const inventory = searchParams.getAll("inventory[]").map(i => i.toLowerCase());

  const file = path.join(process.cwd(), "src", "data", "recipes.json");
  const recipes = JSON.parse(fs.readFileSync(file, "utf8"));

  let filtered = recipes.map(r => {
    const matchCount = r.ingredients.filter(ing =>
      inventory.some(inv => inv.includes(ing.name.toLowerCase()))
    ).length;

    return {
      ...r,
      required_count: r.ingredients.length,
      match_count: matchCount,
      missing_count: r.ingredients.length - matchCount,
    };
  });

  // Apply search
  if (q) {
    filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.ingredients.some(i => i.name.toLowerCase().includes(q))
    );
  }

  // Apply cuisine filter
  if (cuisine) {
    filtered = filtered.filter(r => r.cuisine?.toLowerCase() === cuisine);
  }

  // Apply calories filter
  if (calories) {
    const limit = parseInt(calories, 10);
    filtered = filtered.filter(r => (r.nutrition?.kcal || 0) <= limit);
  }

  // Suggestions (≤ 2 missing ingredients)
  if (suggest) {
    filtered = filtered.filter(r => r.missing_count <= 2);
  }

  return NextResponse.json(filtered);
}
