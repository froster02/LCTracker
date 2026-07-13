import { auth, signIn } from "@/lib/auth";
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
            LeetTracker02
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Automatically track your LeetCode submissions and visualize your progress
            with rich analytics. Build a consistent coding habit.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.34.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .3.21.66.79.55A10.52 10.52 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5z" />
                </svg>
                Sign in with GitHub
              </button>
            </form>
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
                GitHub OAuth for auth, encrypted API keys for the extension, and rate limiting.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
