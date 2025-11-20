"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent, setUserContext, clearUserContext } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Status = "idle" | "ok" | "error" | "disabled";

type StatusRow = {
  label: string;
  status: Status;
  detail?: string;
};

const statusStyles: Record<Status, string> = {
  idle: "bg-muted text-foreground",
  ok: "bg-emerald-500 text-emerald-950",
  error: "bg-danger-red text-concrete-white",
  disabled: "bg-amber-400 text-amber-950",
};

export default function TestAnalyticsClient() {
  const [clientStatus, setClientStatus] = useState<Status>("idle");
  const [serverStatus, setServerStatus] = useState<Status>("idle");
  const [sentryStatus, setSentryStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [isRunning, setIsRunning] = useState(false);

  const rows: StatusRow[] = useMemo(
    () => [
      { label: "Client Transport", status: clientStatus },
      { label: "Server Transport", status: serverStatus },
      { label: "Sentry Error Path", status: sentryStatus, detail },
    ],
    [clientStatus, serverStatus, sentryStatus, detail]
  );

  const runHealthChecks = async () => {
    setIsRunning(true);
    setDetail(undefined);
    setClientStatus("idle");
    setServerStatus("idle");
    setSentryStatus("idle");

    try {
      // Client path: no-op in dev if disabled but should not throw
      await trackEvent("Marketing Page View", { path: "/test-analytics" });
      setClientStatus("ok");
    } catch (error) {
      setClientStatus("error");
      setDetail(String((error as Error).message));
    }

    try {
      const res = await fetch("/api/test-error?type=report");
      if (res.status === 404) {
        setServerStatus("disabled");
        setSentryStatus("disabled");
        setDetail("API guard returned 404 (likely non-dev env)");
      } else if (!res.ok) {
        setServerStatus("error");
        setSentryStatus("error");
        setDetail(`API status ${res.status}`);
      } else {
        setServerStatus("ok");
        setSentryStatus("ok");
      }
    } catch (error) {
      setServerStatus("error");
      setSentryStatus("error");
      setDetail(String((error as Error).message));
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runHealthChecks();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl uppercase tracking-wide">
          Analytics Self‑Test
        </h1>
        <p className="font-mono text-sm uppercase tracking-wide text-concrete-gray">
          Dev-only surface to verify transports and redaction. 404s in preview
          or production.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="border-3 border-concrete-black dark:border-concrete-white bg-background p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-wider">
                {row.label}
              </p>
              <span
                className={cn(
                  "px-2 py-1 text-[10px] font-mono uppercase tracking-wider border-2 border-concrete-black dark:border-concrete-white",
                  statusStyles[row.status]
                )}
              >
                {row.status}
              </span>
            </div>
            {row.detail ? (
              <p className="text-xs text-muted-foreground">{row.detail}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={runHealthChecks} disabled={isRunning}>
          {isRunning ? "Running..." : "Re-run Checks"}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            trackEvent("Exercise Created", {
              exerciseId: "test-123",
              source: "manual",
            })
          }
        >
          Track Exercise Created
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            trackEvent("Set Logged", {
              setId: "set-456",
              exerciseId: "ex-789",
              reps: 10,
              weight: 135,
            })
          }
        >
          Track Set Logged
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setUserContext("user-test-123", { cohort: "dev-only" })
          }
        >
          Set User Context
        </Button>
        <Button variant="outline" onClick={clearUserContext}>
          Clear User Context
        </Button>
      </div>
    </div>
  );
}
