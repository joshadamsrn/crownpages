"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GenerateLicensePage() {
  const [bypass, setBypass] = useState("");
  const [seats, setSeats] = useState(5);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/generate-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bypass, seats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setMessage(`License code created: ${data.code}`);
    } catch (err: any) {
      setMessage(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold mb-4">Generate Team License Code</h1>
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block mb-1 text-sm">Bypass Code</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={bypass}
            onChange={(e) => setBypass(e.target.value)}
            placeholder="Enter admin bypass code"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Max Seats</label>
          <input
            type="number"
            min={1}
            className="w-full border rounded px-3 py-2"
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </div>
  );
}


