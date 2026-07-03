"use client";

import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession, signIn } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="mb-4 text-2xl font-bold">Sign in required</h1>
          <button
            onClick={() => signIn("google")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in with Google
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
            <CardTitle>Chrome Extension</CardTitle>
            <CardDescription>Install the LeetCode Galaxy extension to auto-track submissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium">Setup Instructions</h3>
              <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                <li>Install the LeetCode Galaxy Chrome Extension from the Chrome Web Store (or load it unpacked in developer mode).</li>
                <li>Click the extension icon and sign in with Google.</li>
                <li>The extension will automatically detect and track your LeetCode submissions.</li>
                <li>Visit your Dashboard to see rich analytics and progress.</li>
              </ol>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium">How It Works</h3>
              <p className="text-sm text-muted-foreground">
                The extension uses Google OAuth to authenticate and receives an API key. 
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
