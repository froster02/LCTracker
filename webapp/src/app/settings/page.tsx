"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession, signIn } from "next-auth/react";

interface GithubStatus {
  githubLogin: string | null;
  repoSyncEnabled: boolean;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [github, setGithub] = useState<GithubStatus | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/settings/github-status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setGithub)
      .catch(() => setGithub(null));
  }, [session?.user]);

  if (!session?.user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="mb-4 text-2xl font-bold">Sign in required</h1>
          <button
            onClick={() => signIn("github")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in with GitHub
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold">Settings</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your LeetCode Galaxy account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{session.user.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{session.user.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">User ID</span>
              <span className="text-sm font-mono text-muted-foreground">{session.user.id}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>GitHub Solution Sync</CardTitle>
            <CardDescription>
              Accepted solutions are auto-committed to a repo on your GitHub account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {github?.repoSyncEnabled ? (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Repository</span>
                  <a
                    href={`https://github.com/${github.githubLogin}/leetcode-galaxy`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium underline underline-offset-2"
                  >
                    {github.githubLogin}/leetcode-galaxy
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  The repo is created automatically (private) on your first accepted
                  submission. Each solution lands as{" "}
                  <code>{"{Difficulty}/{problem}/solution.{ext}"}</code> with a metadata README.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Repo sync is not active yet. Sign out and sign back in with GitHub to
                grant repository access — after that, every accepted solution is
                committed to <code>leetcode-galaxy</code> on your account.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Chrome Extension</CardTitle>
            <CardDescription>Install the LeetCode Galaxy extension to auto-track submissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium">Setup Instructions</h3>
              <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                <li>Install the LeetCode Galaxy Chrome Extension from the Chrome Web Store (or load it unpacked in developer mode).</li>
                <li>Click the extension icon and sign in with GitHub.</li>
                <li>The extension will automatically detect and track your LeetCode submissions.</li>
                <li>Visit your Dashboard to see rich analytics and progress.</li>
              </ol>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium">How It Works</h3>
              <p className="text-sm text-muted-foreground">
                The extension uses GitHub OAuth to authenticate and receives an API key.
                It intercepts LeetCode submission events to capture problem metadata, language, 
                runtime, memory, and status. If you go offline, submissions are queued and synced 
                automatically when connectivity returns.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
