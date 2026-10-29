import { expect, test } from "@playwright/test";
import { confirmAllFields, next, scanSample, signInAs, tomorrowIso } from "./helpers";

// E2E 3: ambiguous instructions can't produce an automatic schedule.
test("“as directed” instructions are blocked with clarification guidance", async ({ page }) => {
  await signInAs(page, "Alex");
  await scanSample(page, "“As directed” cream");
  await confirmAllFields(page);
  await expect(page.getByText("We can't create automatic reminders from these instructions")).toBeVisible();
  await expect(page.getByText(/pharmacist or prescriber/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview reminders" })).toHaveCount(0);

  // The API refuses too, even if the UI were bypassed: re-extract and try to schedule directly.
  const docId = new URL(page.url()).pathname.split("/").pop();
  const extract = await page.request.post(`/api/documents/${docId}/extract`);
  expect(extract.ok()).toBe(true);
  const { extraction } = await extract.json();
  const res = await page.request.post("/api/schedules", {
    data: { extractionId: extraction.id, times: ["08:00"], startDate: tomorrowIso(), timezone: "UTC", approved: true },
  });
  expect(res.status()).toBe(422); // new extraction is unverified → refused
});

// E2E 4: symptom information shows sources and no diagnosis.
test("symptom information shows citations and uncertainty", async ({ page }) => {
  await signInAs(page, "Alex");
  await page.goto("/symptoms");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Cough" }).click();
  await next(page).click();
  await page.getByLabel("2–7 days").check();
  await page.locator('input[name="vulnerable"]').nth(1).check();
  await next(page).click();
  for (const group of await page.locator("fieldset").all()) await group.getByLabel("No").check();
  await page.getByRole("button", { name: "See information" }).click();

  await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cough/ })).toHaveAttribute("href", "https://www.nhs.uk/symptoms/cough/");
  await expect(page.getByText(/isn.t a diagnosis/)).toBeVisible();
});

test("red-flag answers escalate before any information is shown", async ({ page }) => {
  await signInAs(page, "Alex");
  await page.goto("/symptoms");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Cough" }).click();
  await next(page).click();
  await page.getByLabel("Less than 2 days").check();
  await page.locator('input[name="vulnerable"]').nth(1).check();
  await next(page).click();
  const groups = await page.locator("fieldset").all();
  await groups[0].getByLabel("Yes").check();
  for (const g of groups.slice(1)) await g.getByLabel("No").check();
  await page.getByRole("button", { name: "See information" }).click();
  await expect(page.getByRole("heading", { name: "Get emergency help now" })).toBeVisible();
});

// E2E 5: one user can't access another user's documents or reminders.
test("users cannot access each other's documents", async ({ browser }) => {
  const alex = await browser.newPage();
  await signInAs(alex, "Alex");
  await scanSample(alex, "Clear 7-day course");
  const docUrl = new URL(alex.url()).pathname;
  const docId = docUrl.split("/").pop();

  const sam = await browser.newPage();
  await signInAs(sam, "Sam");
  await sam.goto(docUrl);
  await expect(sam.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  expect((await sam.request.get(`/api/documents/${docId}/file`)).status()).toBe(404);
  expect((await sam.request.post(`/api/documents/${docId}/extract`)).status()).toBe(404);
  const reminders = await (await sam.request.get("/api/reminders")).json();
  expect(reminders.items).toEqual([]);
});
