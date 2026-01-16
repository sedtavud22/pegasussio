"use client";

import {
  GitPullRequest,
  GitMerge,
  Clock,
  ExternalLink,
  Check,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Helper to check if PR is recent (within 30 mins)
const isRecentPR = (createdAt: string) => {
  const diff = new Date().getTime() - new Date(createdAt).getTime();
  return diff < 30 * 60 * 1000; // 30 minutes in ms
};

// Helper to get branch color styles
const getBranchStyle = (branch: string) => {
  const b = branch.toLowerCase();
  if (b === "dev")
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
  if (b === "uat")
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
  if (b === "master" || b === "main")
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  if (b.startsWith("release"))
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  if (b.includes("hotfix"))
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
  
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
};

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  head: {
    ref: string;
    label: string;
  };
  base: {
    ref: string;
    label: string;
    repo: {
      full_name: string;
    };
  };
}

interface PRListProps {
  pullRequests: PullRequest[];
  loading: boolean;
  onSelectPR: (pr: PullRequest) => void;
  onQuickApprove: (pr: PullRequest) => void;
}

export function PRList({
  pullRequests,
  loading,
  onSelectPR,
  onQuickApprove,
}: PRListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (pullRequests.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
        <GitPullRequest className="mb-4 h-12 w-12 opacity-20" />
        <p className="text-lg font-medium">No pull requests found</p>
        <p className="text-sm">Add some repositories to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {pullRequests.map((pr) => {
        const isRecent = isRecentPR(pr.created_at);
        
        return (
          <button
            key={pr.id}
            onClick={() => onSelectPR(pr)}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border bg-white p-4 text-left shadow-sm transition-all w-full",
              isRecent 
                ? "border-amber-400/50 shadow-[0_0_15px_-3px_rgba(251,191,36,0.2)] dark:border-amber-500/30 dark:shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]" 
                : "border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 hover:shadow-md dark:hover:border-blue-500/50",
              "dark:bg-zinc-950"
            )}
          >
            {isRecent && (
              <div className="absolute -top-2 -right-2 z-10">
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 shadow-sm ring-1 ring-white dark:bg-amber-900/40 dark:text-amber-400 dark:ring-zinc-950">
                  <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Latest
                </span>
              </div>
            )}
            
            <div className="space-y-3 w-full">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {pr.base.repo.full_name}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(pr.created_at).toLocaleDateString()}
                </span>
              </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <GitMerge className="h-3 w-3" />
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                {pr.head.ref}
              </span>
              <span>→</span>
              <span
                className={cn(
                  "font-mono px-1.5 py-0.5 rounded border",
                  getBranchStyle(pr.base.ref)
                )}
              >
                {pr.base.ref}
              </span>
            </div>

            <h3 className="line-clamp-2 font-medium leading-normal text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
              {pr.title}
            </h3>
          </div>

          <div className="mt-4 flex w-full items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
            <div className="flex items-center gap-2">
              <img
                src={pr.user.avatar_url}
                alt={pr.user.login}
                className="h-5 w-5 rounded-full"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {pr.user.login}
              </span>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2">
              <div
                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 p-1.5 rounded-full transition-colors"
                title="Quick Approve (LGTM)"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickApprove(pr);
                }}
              >
                <Check className="h-4 w-4" />
              </div>
              <div
                className="text-zinc-400 hover:text-blue-500 transition-colors p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(pr.html_url, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </div>
            </div>
          </div>
        </button>
        );
      })}
    </div>
  );
}
