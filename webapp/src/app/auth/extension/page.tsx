"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type Status = "loading" | "sign-in" | "connecting" | "success" | "error";

function ExtensionAuthContent() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const extId = searchParams.get("ext_id");
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!session?.user) {
      setStatus("sign-in");
      return;
    }

    if (!extId) {
      setError("Missing extension ID. Please open this page from the extension.");
      setStatus("error");
      return;
    }

    setStatus("connecting");

    fetch("/api/extension/auth-session", { method: "POST" })
      .then((r) => r.json())
      .then(({ apiKey, userId, error: err }) => {
        if (err || !apiKey) {
          setError(err ?? "Failed to create API key");
          setStatus("error");
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chr = (window as any).chrome as {
          runtime?: { sendMessage: (...args: unknown[]) => void; lastError?: { message: string } };
        } | undefined;

        if (!chr?.runtime?.sendMessage) {
          setError("Chrome extension API not available. Make sure you opened this page from the extension.");
          setStatus("error");
          return;
        }

        const runtime = chr.runtime;
        runtime.sendMessage(extId, { type: "AUTH_SUCCESS", apiKey, userId }, () => {
          if (runtime.lastError) {
            setError(`Could not reach extension: ${runtime.lastError.message}. Reload the extension and try again.`);
            setStatus("error");
            return;
          }
          setStatus("success");
          setTimeout(() => window.close(), 1500);
        });
      })
      .catch(() => {
        setError("Network error — please try again.");
        setStatus("error");
      });
  }, [session, sessionStatus, extId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4 text-center">
        <div className="text-3xl">🌌</div>
        <h1 className="text-xl font-bold">LeetCode Galaxy</h1>

        {status === "loading" && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {status === "sign-in" && (
          <>
            <p className="text-sm text-muted-foreground">
              Sign in to connect the extension to your account.
            </p>
            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in with Google
            </button>
          </>
        )}

        {status === "connecting" && (
          <p className="text-sm text-muted-foreground">Connecting to extension…</p>
        )}

        {status === "success" && (
          <p className="text-sm text-green-600 font-medium">
            ✓ Extension connected! This tab will close automatically.
          </p>
        )}

        {status === "error" && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}

export default function ExtensionAuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    }>
      <ExtensionAuthContent />
    </Suspense>
  );
}
