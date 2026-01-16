"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

interface RepoInputProps {
  repos: string[];
  onAddRepo: (repo: string) => void;
  onRemoveRepo: (repo: string) => void;
}

export function RepoInput({ repos, onAddRepo, onRemoveRepo }: RepoInputProps) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (input.trim() && !repos.includes(input.trim())) {
      onAddRepo(input.trim());
      setInput("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="owner/repo (e.g. facebook/react)"
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {repos.map((repo) => (
          <div
            key={repo}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <span>{repo}</span>
            <button
              onClick={() => onRemoveRepo(repo)}
              className="text-zinc-400 hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
