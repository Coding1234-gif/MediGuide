import { expect, type Page } from "@playwright/test";

export async function signInAs(page: Page, who: "Alex" | "Sam") {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Continue as ${who} (demo)` }).click();
  // First hit compiles the dashboard in dev mode, which can be slow.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
}

/** Upload a bundled fictional sample via the scan page and wait for the review screen. */
export async function scanSample(page: Page, title: string) {
  await page.goto("/scan");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: title }).click();
  await expect(page).toHaveURL(/\/scan\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.getByText("Pre-written sample result")).toBeVisible({ timeout: 30_000 });
}

/** Explicitly confirm every field that has a value, then attest and submit. */
export async function confirmAllFields(page: Page) {
  const labels = page.locator('label:has(input[type=radio][value="confirmed"]:not([disabled]))');
  const n = await labels.count();
  for (let i = 0; i < n; i++) {
    await labels.nth(i).click();
    await expect(labels.nth(i).locator("input")).toBeChecked();
  }
  await page.getByRole("checkbox", { name: /compared each detail/i }).click();
  await page.getByRole("button", { name: "Confirm details" }).click();
}

export function tomorrowIso() {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

export const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true });
