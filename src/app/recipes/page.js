'use client';

export default function RecipesPage() {
  return (
    <div style={{ padding: '16px', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>🍲 Recipes</h1>
      <div className="card" style={{ marginTop: '12px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Coming Soon</h2>
        <p className="small">
          We’re working on recipe suggestions that match your pantry.  
          You’ll see both Indian and global dishes you can cook with what you already have.
        </p>
      </div>
    </div>
  );
}
