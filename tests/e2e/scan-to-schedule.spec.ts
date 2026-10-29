import { expect, test } from "@playwright/test";
import { confirmAllFields, scanSample, signInAs, tomorrowIso } from "./helpers";

// E2E 1 + 2: upload a fictional document, verify it, create a schedule, see reminders.
test("clear instructions become a verified reminder schedule", async ({ page }) => {
  await signInAs(page, "Alex");
  await scanSample(page, "Clear 7-day course");

  // Verification is mandatory: the confirm button stays disabled until every field is checked.
  await expect(page.getByRole("button", { name: "Confirm details" })).toBeDisabled();
  await expect(page.getByText("THREE times a day", { exact: true })).toBeVisible();

  await confirmAllFields(page);
  await expect(page.getByRole("heading", { name: "Set up reminders" })).toBeVisible();

  await page.getByLabel("Start date").fill(tomorrowIso());
  await page.getByRole("button", { name: "Preview reminders" }).click();
  await expect(page.getByText(/21 reminders for Corvanex/)).toBeVisible();

  const create = page.getByRole("button", { name: "Create schedule" });
  await expect(create).toBeDisabled(); // explicit approval required
  await page.getByRole("checkbox", { name: /checked these reminders/i }).click();
  await create.click();

  await expect(page).toHaveURL(/\/schedules\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /Upcoming \(21\)/ })).toBeVisible();
});
