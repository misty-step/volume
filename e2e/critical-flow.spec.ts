import { test, expect } from "./auth-fixture";

test("Critical Path: Create Exercise and Log Set", async ({ page }) => {
  // 1. Start at dashboard (authenticated)
  await page.goto("/today");

  // Verify we are on the dashboard (use h1 specifically to avoid ambiguity)
  await expect(page.locator("h1").getByText("Today")).toBeVisible();

  // 2. Create a new exercise
  const exerciseName = `Test Lift ${Date.now()}`;

  // Check if we're in First Run Experience (no exercises yet)
  const welcomeMessage = page.getByText("Welcome to Volume");
  const isFirstRun = await welcomeMessage.isVisible().catch(() => false);

  if (isFirstRun) {
    // First Run Experience: Use inline exercise creator
    const exerciseInput = page.getByPlaceholder(
      "Exercise name (e.g., Push-ups)"
    );
    await exerciseInput.fill(exerciseName);
    await page.getByRole("button", { name: "Create" }).click();

    // Wait for exercise to be created and QuickLogForm to appear
    await expect(page.getByTestId("quick-log-exercise-select")).toBeVisible();
  } else {
    // Regular flow: Use exercise selector
    await page.getByTestId("quick-log-exercise-select").click();

    // Select "Create New"
    await page.getByTestId("quick-log-create-new").click();

    // Enter unique name
    await page.getByTestId("create-exercise-name-input").fill(exerciseName);
    await page.getByTestId("create-exercise-submit-btn").click();

    // Verify exercise is selected (combobox button text should match)
    await expect(page.getByTestId("quick-log-exercise-select")).toHaveText(
      exerciseName
    );
  }

  // 3. Log a set
  await page.getByTestId("quick-log-weight-input").fill("135");
  await page.getByTestId("quick-log-reps-input").fill("10");
  await page.getByTestId("quick-log-submit-btn").click();

  // 4. Verify success toast (sonner uses a status region, so match by text)
  await expect(
    page.getByText(/Set logged|NEW PR!/, { exact: false })
  ).toBeVisible({ timeout: 15000 });

  // 5. Verify it appears in history (optimistic update)
  // Assert via accessible name instead of internal IDs that use the server-generated _id.
  const exerciseGroup = page.getByRole("button", { name: exerciseName });
  await expect(exerciseGroup).toBeVisible();

  // Expand if not expanded (it should be expanded by default if it's today? Or maybe not)
  // The component code says "Header - Always visible, clickable to expand/collapse".
  // Default state is collapsed: `const [isExpanded, setIsExpanded] = useState(false);`
  // Wait, if we just logged it, does it auto-expand?
  // Looking at `ExerciseSetGroup`: no auto-expand logic visible in the snippet I read.
  // So we click to expand.
  await exerciseGroup.click();

  // Check for the set data
  const setItem = page
    .locator(
      `[data-testid^="exercise-set-item-"][data-exercise-name="${exerciseName}"]`
    )
    .first();

  await expect(setItem).toBeVisible();
  await expect(setItem.getByTestId("set-weight-value")).toHaveText("135");
  await expect(setItem.getByTestId("set-weight-unit")).toHaveText("LBS");
  await expect(setItem.getByTestId("set-reps-value")).toHaveText("10");
  await expect(setItem.getByTestId("set-reps-label")).toHaveText("REPS");

  // 6. Delete the set
  // We need to find the delete button. Since we don't have the ID, we use the first one visible
  // or scoped to the group.
  // Using a locator that targets the delete button within the group.
  // We know the structure: group -> expanded content -> set item -> delete button.
  // But since we used `data-testid` with IDs, we might be stuck if we don't know IDs.
  // However, we added data-testid to buttons like `delete-set-btn-${set._id}`.
  // If we can't match the ID, we can match by partial attribute or role.

  // Let's find the delete button inside the expanded area.
  // The exercise group button is the header. The content is a sibling? No, it's inside the same parent div but conditionally rendered.
  // Actually, `ExerciseSetGroup` renders:
  // <div ...>
  //   <button ...Header... />
  //   {isExpanded && <div ...SetList... />}
  // </div>

  // So we can scope:
  // Locate the container that has the text `exerciseName`?
  // The container has `border-3 ...`.

  // Let's just click the first delete button we find that is visible.
  // Since this is a clean test user (ideally) or we just created a unique exercise,
  // it should be the only set for this exercise.

  const deleteBtn = setItem
    .locator('button[data-testid^="delete-set-btn-"]')
    .first();
  await deleteBtn.click();

  // 7. Confirm delete
  await page.getByTestId("confirm-delete-btn").click();

  // 8. Verify gone
  await expect(page.getByText("Set deleted")).toBeVisible();
  await expect(setItem).toBeHidden();
});
