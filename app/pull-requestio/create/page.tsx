"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Octokit } from "octokit";
import { toast } from "sonner";
import { ArrowLeft, Loader2, GitPullRequest } from "lucide-react";

import { SearchableSelect } from "../components/searchable-select";

export default function CreatePRPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [repos, setRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");

  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [base, setBase] = useState("");
  const [head, setHead] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Load initial state
  useEffect(() => {
    const savedToken = localStorage.getItem("github_token");
    if (!savedToken) {
      toast.error("Please add a GitHub token in the dashboard first");
      router.push("/");
      return;
    }
    setToken(savedToken);

    const savedRepos = localStorage.getItem("watched_repos");
    if (savedRepos) {
      try {
        const parsed = JSON.parse(savedRepos);
        if (Array.isArray(parsed)) {
          setRepos(parsed);
          if (parsed.length > 0) {
            setSelectedRepo(parsed[0]);
          }
        }
      } catch (e) {
        console.error("Failed to parse repos", e);
      }
    }
  }, [router]);

  // Fetch branches when repo changes
  useEffect(() => {
    async function fetchBranches() {
      if (!selectedRepo || !token) return;

      setLoadingBranches(true);
      setBranches([]);
      setBase("");
      setHead("");

      try {
        const octokit = new Octokit({ auth: token });
        const [owner, repo] = selectedRepo.split("/");

        // Fetch branches (paginated? just first 100 for now or filter?)
        // GitHub API defaults to 30, max 100 per page.
        const { data } = await octokit.rest.repos.listBranches({
          owner,
          repo,
          per_page: 100,
        });

        const branchNames = data.map((b) => b.name);
        setBranches(branchNames);

        // Smart defaults
        if (branchNames.includes("main")) setBase("main");
        else if (branchNames.includes("master")) setBase("master");
        else if (branchNames.length > 0) setBase(branchNames[0]);

        // For head, maybe second one or none
        if (
          branchNames.length > 1 &&
          branchNames[1] !== "main" &&
          branchNames[1] !== "master"
        ) {
          setHead(branchNames[1]);
        } else if (branchNames.length > 0) {
          setHead(branchNames[0]);
        }
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        toast.error("Failed to fetch branches. Check permissions.");
      } finally {
        setLoadingBranches(false);
      }
    }

    fetchBranches();
  }, [selectedRepo, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !head || !base) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const octokit = new Octokit({ auth: token });
      const [owner, repo] = selectedRepo.split("/");

      const { data } = await octokit.rest.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base,
      });

      toast.success("Pull request created successfully!");
      router.push("/");
    } catch (error: any) {
      console.error("Failed to create PR:", error);
      toast.error(
        `Failed to create PR: ${error.response?.data?.message || error.message}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-6">
      <div className="mx-auto max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 p-6 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 -ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Create Pull Request
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Repo Selection */}
          <div>
            <SearchableSelect
              label="Repository"
              options={repos}
              value={selectedRepo}
              onChange={setSelectedRepo}
              disabled={submitting}
              placeholder="Select repository..."
            />
          </div>

          {/* Branches */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="relative">
                <SearchableSelect
                  label="Base Branch (Into)"
                  options={branches}
                  value={base}
                  onChange={setBase}
                  disabled={loadingBranches || submitting}
                  placeholder="Select base..."
                />
                {loadingBranches && (
                  <div className="absolute right-8 top-9">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="relative">
                <SearchableSelect
                  label="Head Branch (From)"
                  options={branches}
                  value={head}
                  onChange={setHead}
                  disabled={loadingBranches || submitting}
                  placeholder="Select head..."
                />
                {loadingBranches && (
                  <div className="absolute right-8 top-9">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fix login bug"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={submitting}
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your changes..."
              rows={6}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={submitting}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={
                submitting || loadingBranches || !title || !selectedRepo
              }
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitPullRequest className="h-4 w-4" />
              )}
              Create Pull Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
