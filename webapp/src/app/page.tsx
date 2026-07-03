import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            LeetCode Galaxy
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Automatically track your LeetCode submissions and visualize your progress
            with rich analytics. Build a consistent coding habit.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-lg border p-4 text-left">
              <h3 className="font-semibold">Auto Capture</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Chrome extension detects every submission in real-time, including runtime and memory.
              </p>
            </div>
            <div className="rounded-lg border p-4 text-left">
              <h3 className="font-semibold">Rich Analytics</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Heatmaps, streaks, language usage, performance trends, and more.
              </p>
            </div>
            <div className="rounded-lg border p-4 text-left">
              <h3 className="font-semibold">Secure & Scalable</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Google OAuth for auth, encrypted API keys for the extension, and rate limiting.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
