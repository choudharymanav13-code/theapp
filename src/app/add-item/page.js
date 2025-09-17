// src/app/add-item/page.js
'use client';
import { useState, useEffect } from 'react';
import { searchFallbackFoods } from '@/data/fallbackFoods';
import { BrowserMultiFormatReader } from '@zxing/library';

export default function AddItemPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [scanning, setScanning] = useState(false);

  // ---------- Helpers ----------
  async function searchFoods(q) {
    const needle = q.trim().toLowerCase();

    // 1. packaged products (your static JSON from API route)
    let packaged = [];
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(needle)}`);
      if (res.ok) {
        packaged = await res.json();
      }
    } catch (e) {
      console.error('Error fetching packaged foods:', e);
    }

    // 2. fallback staples
    const staples = searchFallbackFoods(needle);

    // 3. merge both
    const merged = [...staples, ...packaged];
    setResults(merged);
  }

  // ---------- Barcode ----------
  async function startScan() {
    setScanning(true);
    const codeReader = new BrowserMultiFormatReader();
    try {
      const videoElement = document.createElement('video');
      document.body.appendChild(videoElement);

      const result = await codeReader.decodeOnceFromVideoDevice(undefined, videoElement);
      const scannedCode = result.getText();
      console.log('Scanned barcode:', scannedCode);

      // Try packaged foods first
      const res = await fetch(`/api/food-search?barcode=${scannedCode}`);
      let items = [];
      if (res.ok) {
        items = await res.json();
      }

      // If not found, try fallback staples (barcode not real, so we just search by text)
      if (items.length === 0) {
        const fallback = searchFallbackFoods(scannedCode, null, 1);
        if (fallback.length > 0) {
          items = fallback;
        }
      }

      setResults(items);
      codeReader.reset();
      videoElement.remove();
      setScanning(false);
    } catch (err) {
      console.error('Barcode scan failed:', err);
      setScanning(false);
    }
  }

  // ---------- Effects ----------
  useEffect(() => {
    if (!searchQuery) {
      // default staples list
      setResults(searchFallbackFoods('', null, 20));
    } else {
      searchFoods(searchQuery);
    }
  }, [searchQuery]);

  // ---------- UI ----------
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Add Item</h1>

      <input
        type="text"
        placeholder="Search food..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="border p-2 w-full mb-4 rounded"
      />

      <button
        onClick={startScan}
        disabled={scanning}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {scanning ? 'Scanning…' : 'Scan Barcode'}
      </button>

      <ul>
        {results.map((item) => (
          <li key={item.code} className="border-b py-2">
            <strong>{item.name}</strong> {item.brand && `(${item.brand})`}<br />
            {item.kcal_100g} kcal / 100g
          </li>
        ))}
      </ul>
    </div>
  );
}
