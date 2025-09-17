import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req) {
  try {
    // parse inventory[] query params
    const { searchParams } = new URL(req.url);
    const inventory = searchParams.getAll("inventory[]").map(i => i.toLowerCase());

    // load recipes.json
    const filePath = path.join(process.cwd(), "src", "data", "recipes.json");
    const data = fs.readFileSync(filePath, "utf8");
    const recipes = JSON.parse(data);

    // if no inventory passed, return top 20 random recipes
    if (!inventory || inventory.length === 0) {
      return NextResponse.json(recipes.slice(0, 20));
    }

    // match scoring
    const scored = recipes.map(r => {
      let matchCount = 0;
      r.ingredients.forEach(ing => {
        const ingName = ing.name.toLowerCase();
        if (inventory.some(inv => ingName.includes(inv) || inv.includes(ingName))) {
          matchCount++;
        }
      });
      return {
        ...r,
        match_count: matchCount,
        required_count: r.ingredients.length
      };
    });

    // sort by highest matches first
    scored.sort((a, b) => (b.match_count || 0) - (a.match_count || 0));

    return NextResponse.json(scored.slice(0, 50)); // cap at 50
  } catch (err) {
    console.error("recipes api error", err);
    return NextResponse.json({ error: "failed to load recipes" }, { status: 500 });
  }
}
