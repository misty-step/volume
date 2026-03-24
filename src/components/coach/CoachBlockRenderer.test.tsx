import type { Spec } from "@json-render/core";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../../test/utils";
import { CoachSpecRenderer } from "./CoachBlockRenderer";
import {
  StatusBlock,
  UndoBlock,
  BillingPanelBlock,
  QuickLogFormBlock,
} from "@/components/ui/coach-block";

/**
 * These tests verify visual rendering of coach block UI components is
 * unchanged after the json-render migration. The components themselves
 * are unchanged — only the orchestration layer that calls them changed
 * (from a switch statement to defineRegistry).
 */
describe("Coach block UI components", () => {
  it("renders undo blocks and calls onUndo with action and turn ids", async () => {
    const onUndo = vi.fn();

    render(
      <UndoBlock
        title="Undo this log"
        description="Revert the logged set."
        actionId="action_123"
        turnId="turn_456"
        onUndo={onUndo}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onUndo).toHaveBeenCalledWith("action_123", "turn_456");
  });

  it("renders billing panel and triggers client action", async () => {
    const onClientAction = vi.fn();

    render(
      <BillingPanelBlock
        block={{
          type: "billing_panel",
          status: "trial",
          title: "Subscription",
          ctaLabel: "Upgrade",
          ctaAction: "open_checkout",
        }}
        onClientAction={onClientAction}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Upgrade" }));
    expect(onClientAction).toHaveBeenCalledWith("open_checkout");
  });

  it("renders quick log form and submits prompt", async () => {
    const onPrompt = vi.fn();

    render(
      <QuickLogFormBlock
        block={{
          type: "quick_log_form",
          title: "Quick log",
          defaultUnit: "lbs",
        }}
        onPrompt={onPrompt}
      />
    );

    await userEvent.type(
      screen.getByPlaceholderText("Exercise name"),
      "Push-ups"
    );
    await userEvent.type(screen.getByPlaceholderText("Reps"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Log Set" }));

    expect(onPrompt).toHaveBeenCalledWith("12 Push-ups");
  });
});

describe("CoachSpecRenderer", () => {
  it("renders new presentation scenes and dispatches typed actions", async () => {
    const handlers = {
      submit_prompt: vi.fn(),
      prefill_prompt: vi.fn(),
      undo_agent_action: vi.fn(),
      set_preference: vi.fn(),
      open_checkout: vi.fn(),
      open_billing_portal: vi.fn(),
      quick_log_submit: vi.fn(),
    };

    const spec: Spec = {
      root: "scene",
      elements: {
        scene: {
          type: "Scene",
          props: { title: "Coach", subtitle: "Daily review" },
          children: [
            "daily",
            "analytics",
            "insight",
            "history",
            "library",
            "settings",
            "billing",
            "logOutcome",
            "clarify",
            "confirm",
            "pref",
            "quick",
            "tray",
          ],
        },
        daily: {
          type: "DailySnapshot",
          props: {
            title: "Today's totals",
            subtitle: "Strong consistency today.",
            totalSets: 6,
            totalReps: 42,
            totalDurationSeconds: 90,
            exerciseCount: 2,
            topExercises: [
              { name: "Push-ups", sets: 4, reps: 32, durationSeconds: null },
              { name: "Plank", sets: 2, reps: null, durationSeconds: 90 },
            ],
          },
        },
        analytics: {
          type: "AnalyticsOverview",
          props: {
            currentStreak: 3,
            longestStreak: 7,
            workoutDays: 11,
            recentVolume: 240,
            recentPrs: [
              {
                exerciseName: "Push-ups",
                prLabel: "32 reps",
                detail: "Best set this month",
              },
            ],
            overload: [
              {
                exerciseName: "Plank",
                trend: "Up",
                note: "Hold time increasing",
              },
            ],
            focusSuggestions: [
              {
                title: "Add pulling work",
                priority: "high",
                reason: "Your push volume is outpacing back work.",
              },
            ],
          },
        },
        insight: {
          type: "ExerciseInsight",
          props: {
            exerciseName: "Push-ups",
            takeaway: "Volume is trending up.",
            summaryMetrics: [
              { label: "Total sets", value: "12" },
              { label: "Best set", value: "18 reps" },
            ],
            trend: {
              subtitle: "Last 14 days",
              metric: "reps",
              total: 120,
              bestDay: 24,
              points: [
                { date: "2026-03-20", label: "Mar 20", value: 12 },
                { date: "2026-03-21", label: "Mar 21", value: 24 },
              ],
            },
            recentRows: [
              { label: "Mar 21", value: "18 reps", meta: "Bodyweight" },
            ],
          },
        },
        history: {
          type: "HistoryTimeline",
          props: {
            sessions: [
              {
                dateLabel: "Today",
                summary: "Upper body focus",
                rows: [{ label: "Push-ups", value: "4 sets", meta: "32 reps" }],
              },
            ],
          },
        },
        library: {
          type: "LibraryScene",
          props: {
            title: "Exercise library",
            description: "Active movements",
            items: [
              {
                name: "Push-ups",
                status: "active",
                muscleGroups: ["Chest", "Triceps"],
                lastLogged: "Today",
                note: "Bodyweight press",
              },
            ],
          },
        },
        settings: {
          type: "SettingsScene",
          props: {
            title: "Preferences",
            description: "Current defaults",
            fields: [{ label: "Unit", value: "lbs", emphasis: true }],
          },
        },
        billing: {
          type: "BillingState",
          props: {
            status: "active",
            title: "Membership",
            subtitle: "Active plan",
            trialDaysRemaining: null,
            periodEnd: "2026-04-01",
            ctaLabel: "Manage billing",
          },
          on: {
            cta: { action: "open_billing_portal" },
          },
        },
        logOutcome: {
          type: "LogOutcome",
          props: {
            tone: "success",
            title: "Logged push-ups",
            description: "Set recorded",
            detailRows: [{ label: "Reps", value: "12", meta: null }],
            undoActionId: "action_123",
            undoTurnId: "turn_456",
            undoTitle: "Undo this log",
            undoDescription: "Revert the set.",
          },
          on: {
            undo: {
              action: "undo_agent_action",
              params: { actionId: "action_123", turnId: "turn_456" },
            },
          },
        },
        clarify: {
          type: "ClarifyPanel",
          props: {
            title: "Which exercise?",
            description: "Pick the right movement.",
          },
          children: ["choice"],
        },
        choice: {
          type: "ChoiceCard",
          props: {
            title: "Push-ups",
            description: "Bodyweight",
            meta: "Active",
            tags: ["Chest"],
          },
          on: {
            press: {
              action: "prefill_prompt",
              params: { prompt: "rename push-ups" },
            },
          },
        },
        confirm: {
          type: "ConfirmationPanel",
          props: {
            title: "Delete set?",
            description: "This removes the logged set.",
            confirmLabel: "Delete",
            cancelLabel: "Keep",
          },
          on: {
            confirm: {
              action: "submit_prompt",
              params: { prompt: "delete that set" },
            },
            cancel: {
              action: "prefill_prompt",
              params: { prompt: "keep that set" },
            },
          },
        },
        pref: {
          type: "PreferenceCard",
          props: {
            title: "Weight unit",
            description: "Local preference",
            valueLabel: "KG",
          },
          on: {
            press: {
              action: "set_preference",
              params: { key: "unit", value: "kg" },
            },
          },
        },
        quick: {
          type: "QuickLogComposer",
          props: {
            title: "Quick log",
            exerciseName: "Push-ups",
            reps: "12",
            durationSeconds: null,
            weight: "45",
            unit: "kg",
            helperText: "Structured logging",
          },
        },
        tray: {
          type: "ActionTray",
          props: {},
          children: ["chip"],
        },
        chip: {
          type: "ActionChip",
          props: { label: "Show trend" },
          on: {
            press: {
              action: "submit_prompt",
              params: { prompt: "show trend for push-ups" },
            },
          },
        },
      },
    };

    render(<CoachSpecRenderer spec={spec} handlers={handlers} />);

    expect(screen.getByText("Coach")).toBeInTheDocument();
    expect(screen.getByText("Analytics overview")).toBeInTheDocument();
    expect(screen.getByText("Push-ups snapshot")).toBeInTheDocument();
    expect(screen.getByText("Exercise library")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Manage billing" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    await userEvent.click(screen.getByRole("button", { name: /Push-ups/i }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Weight unit KG Local preference" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Show trend" }));
    await userEvent.click(screen.getByRole("button", { name: "Log set" }));

    expect(handlers.open_billing_portal).toHaveBeenCalled();
    expect(handlers.undo_agent_action).toHaveBeenCalledWith({
      actionId: "action_123",
      turnId: "turn_456",
    });
    expect(handlers.prefill_prompt).toHaveBeenCalledWith({
      prompt: "rename push-ups",
    });
    expect(handlers.submit_prompt).toHaveBeenCalledWith({
      prompt: "delete that set",
    });
    expect(handlers.set_preference).toHaveBeenCalledWith({
      key: "unit",
      value: "kg",
    });
    expect(handlers.quick_log_submit).toHaveBeenCalledWith({
      exerciseName: "Push-ups",
      reps: "12",
      durationSeconds: null,
      weight: "45",
      unit: "kg",
    });
  });

  it("renders nullable presentation props without forcing optional UI", () => {
    const handlers = {
      submit_prompt: vi.fn(),
      prefill_prompt: vi.fn(),
      undo_agent_action: vi.fn(),
      set_preference: vi.fn(),
      open_checkout: vi.fn(),
      open_billing_portal: vi.fn(),
      quick_log_submit: vi.fn(),
    };

    const spec: Spec = {
      root: "scene",
      elements: {
        scene: {
          type: "Scene",
          props: { title: "Minimal coach", subtitle: null },
          children: [
            "choice",
            "daily",
            "analytics",
            "insight",
            "history",
            "library",
            "settings",
            "billing",
            "logOutcome",
            "clarify",
            "confirm",
            "pref",
            "quick",
          ],
        },
        choice: {
          type: "ChoiceCard",
          props: {
            title: "Push-ups",
            description: null,
            meta: null,
            tags: null,
          },
        },
        daily: {
          type: "DailySnapshot",
          props: {
            title: "Today",
            subtitle: null,
            totalSets: 1,
            totalReps: 10,
            totalDurationSeconds: 0,
            exerciseCount: 1,
            topExercises: [
              {
                name: "Push-ups",
                sets: 1,
                reps: null,
                durationSeconds: null,
              },
            ],
          },
        },
        analytics: {
          type: "AnalyticsOverview",
          props: {
            currentStreak: 1,
            longestStreak: 1,
            workoutDays: 1,
            recentVolume: 10,
            recentPrs: [
              {
                exerciseName: "Push-ups",
                prLabel: "10 reps",
                detail: null,
              },
            ],
            overload: [
              {
                exerciseName: "Push-ups",
                trend: "Steady",
                note: null,
              },
            ],
            focusSuggestions: [
              {
                title: "Keep going",
                priority: "medium",
                reason: "Consistency matters more than complexity.",
              },
            ],
          },
        },
        insight: {
          type: "ExerciseInsight",
          props: {
            exerciseName: "Push-ups",
            takeaway: null,
            summaryMetrics: [{ label: "Sets", value: "1" }],
            trend: null,
            recentRows: null,
          },
        },
        history: {
          type: "HistoryTimeline",
          props: {
            sessions: [
              {
                dateLabel: "Today",
                summary: null,
                rows: [{ label: "Push-ups", value: "10 reps", meta: null }],
              },
            ],
          },
        },
        library: {
          type: "LibraryScene",
          props: {
            title: "Library",
            description: null,
            items: [
              {
                name: "Push-ups",
                status: "active",
                muscleGroups: null,
                lastLogged: null,
                note: null,
              },
            ],
          },
        },
        settings: {
          type: "SettingsScene",
          props: {
            title: "Settings",
            description: null,
            fields: [{ label: "Unit", value: "lbs", emphasis: null }],
          },
        },
        billing: {
          type: "BillingState",
          props: {
            status: "active",
            title: "Membership",
            subtitle: null,
            trialDaysRemaining: null,
            periodEnd: null,
            ctaLabel: null,
          },
        },
        logOutcome: {
          type: "LogOutcome",
          props: {
            tone: "info",
            title: "Saved",
            description: null,
            detailRows: null,
            undoActionId: null,
            undoTurnId: null,
            undoTitle: null,
            undoDescription: null,
          },
        },
        clarify: {
          type: "ClarifyPanel",
          props: {
            title: "Need detail",
            description: null,
          },
          children: [],
        },
        confirm: {
          type: "ConfirmationPanel",
          props: {
            title: "Proceed?",
            description: "Keep it simple.",
            confirmLabel: null,
            cancelLabel: null,
          },
        },
        pref: {
          type: "PreferenceCard",
          props: {
            title: "Weight unit",
            description: null,
            valueLabel: "LBS",
          },
        },
        quick: {
          type: "QuickLogComposer",
          props: {
            title: "Quick log",
            exerciseName: null,
            reps: null,
            durationSeconds: null,
            weight: null,
            unit: null,
            helperText: null,
          },
        },
      },
    };

    render(<CoachSpecRenderer spec={spec} handlers={handlers} />);

    expect(screen.getByText("Minimal coach")).toBeInTheDocument();
    expect(screen.getByText("Push-ups snapshot")).toBeInTheDocument();
    expect(screen.getByText("Membership")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Undo" })
    ).not.toBeInTheDocument();
  });

  it("shows a user-facing error when quick log submission fails", async () => {
    const handlers = {
      submit_prompt: vi.fn(),
      prefill_prompt: vi.fn(),
      undo_agent_action: vi.fn(),
      set_preference: vi.fn(),
      open_checkout: vi.fn(),
      open_billing_portal: vi.fn(),
      quick_log_submit: vi
        .fn()
        .mockRejectedValue(new Error("network request failed")),
    };

    const spec: Spec = {
      root: "scene",
      elements: {
        scene: {
          type: "Scene",
          props: { title: "Coach", subtitle: null },
          children: ["quick"],
        },
        quick: {
          type: "QuickLogComposer",
          props: {
            title: "Quick log",
            exerciseName: "Push-ups",
            reps: "12",
            weight: "45",
            unit: "kg",
          },
        },
      },
    };

    render(<CoachSpecRenderer spec={spec} handlers={handlers} />);

    await userEvent.click(screen.getByRole("button", { name: "Log set" }));

    await waitFor(() => {
      expect(
        screen.getByText("I couldn't log that set. Try again.")
      ).toBeInTheDocument();
    });
  });

  it("renders legacy component types through the compatibility registry", async () => {
    const handlers = {
      submit_prompt: vi.fn(),
      undo_agent_action: vi.fn(),
      set_preference: vi.fn(),
      open_checkout: vi.fn(),
      open_billing_portal: vi.fn(),
    };

    const spec: Spec = {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Legacy" },
          children: [
            "status",
            "metrics",
            "trend",
            "table",
            "suggestions",
            "entity",
            "detail",
            "billing",
            "quick",
            "confirmation",
            "clientAction",
            "undo",
          ],
        },
        status: {
          type: "Status",
          props: {
            tone: "info",
            title: "Legacy status",
            description: "Still supported",
          },
        },
        metrics: {
          type: "Metrics",
          props: {
            title: "Legacy metrics",
            metrics: [{ label: "Sets", value: "4" }],
          },
        },
        trend: {
          type: "Trend",
          props: {
            title: "Legacy trend",
            subtitle: "Recent",
            metric: "reps",
            points: [{ date: "2026-03-21", label: "Mar 21", value: 12 }],
            total: 12,
            bestDay: 12,
          },
        },
        table: {
          type: "Table",
          props: {
            title: "Legacy table",
            rows: [{ label: "Push-ups", value: "12", meta: "BW" }],
          },
        },
        suggestions: {
          type: "Suggestions",
          props: { prompts: ["show today's summary"] },
        },
        entity: {
          type: "EntityList",
          props: {
            title: "Exercises",
            description: "Legacy list",
            emptyLabel: "None",
            items: [{ title: "Push-ups", prompt: "show push-ups" }],
          },
        },
        detail: {
          type: "DetailPanel",
          props: {
            title: "Detail",
            description: "Legacy detail",
            fields: [{ label: "Unit", value: "lbs", emphasis: true }],
            prompts: ["open settings"],
          },
        },
        billing: {
          type: "BillingPanel",
          props: {
            status: "trial",
            title: "Subscription",
            subtitle: "Legacy billing",
            trialDaysRemaining: 5,
            periodEnd: "2026-04-01",
            ctaLabel: "Upgrade",
            ctaAction: "open_checkout",
          },
        },
        quick: {
          type: "QuickLogForm",
          props: {
            title: "Legacy quick log",
            exerciseName: "Push-ups",
            defaultUnit: "lbs",
          },
        },
        confirmation: {
          type: "Confirmation",
          props: {
            title: "Confirm legacy action",
            description: "Proceed?",
            confirmPrompt: "yes, delete it",
            cancelPrompt: "no, keep it",
            confirmLabel: "Confirm",
            cancelLabel: "Cancel",
          },
        },
        clientAction: {
          type: "ClientAction",
          props: {
            action: "set_weight_unit",
            payload: { unit: "kg" },
          },
        },
        undo: {
          type: "Undo",
          props: {
            actionId: "action_987",
            turnId: "turn_654",
            title: "Undo legacy action",
            description: "Revert it.",
          },
        },
      },
    };

    render(<CoachSpecRenderer spec={spec} handlers={handlers} />);

    expect(screen.getByText("Legacy status")).toBeInTheDocument();
    expect(screen.getByText("Legacy metrics")).toBeInTheDocument();

    await waitFor(() => {
      expect(handlers.set_preference).toHaveBeenCalledWith({
        key: "unit",
        value: "kg",
      });
    });

    await userEvent.click(
      screen.getByRole("button", { name: "show today's summary" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(
      screen.getByRole("button", { name: "open settings" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Upgrade" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(handlers.submit_prompt).toHaveBeenCalledWith({
      prompt: "show today's summary",
    });
    expect(handlers.submit_prompt).toHaveBeenCalledWith({
      prompt: "show push-ups",
    });
    expect(handlers.submit_prompt).toHaveBeenCalledWith({
      prompt: "open settings",
    });
    expect(handlers.open_checkout).toHaveBeenCalled();
    expect(handlers.submit_prompt).toHaveBeenCalledWith({
      prompt: "yes, delete it",
    });
    expect(handlers.undo_agent_action).toHaveBeenCalledWith({
      actionId: "action_987",
      turnId: "turn_654",
    });
  });

  it("dispatches the remaining legacy client action variants", async () => {
    const handlers = {
      set_preference: vi.fn(),
      open_checkout: vi.fn(),
      open_billing_portal: vi.fn(),
    };

    const spec: Spec = {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Legacy actions" },
          children: ["sound", "checkout", "billing"],
        },
        sound: {
          type: "ClientAction",
          props: {
            action: "set_sound",
            payload: { enabled: false },
          },
        },
        checkout: {
          type: "ClientAction",
          props: {
            action: "open_checkout",
            payload: {},
          },
        },
        billing: {
          type: "ClientAction",
          props: {
            action: "open_billing_portal",
            payload: {},
          },
        },
      },
    };

    render(<CoachSpecRenderer spec={spec} handlers={handlers} />);

    await waitFor(() => {
      expect(handlers.set_preference).toHaveBeenCalledWith({
        key: "sound_enabled",
        value: false,
      });
      expect(handlers.open_checkout).toHaveBeenCalledWith({});
      expect(handlers.open_billing_portal).toHaveBeenCalledWith({});
    });
  });
});
