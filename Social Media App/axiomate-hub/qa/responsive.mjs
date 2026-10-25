import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:8787");
for (const width of [320, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Login overflow at " + width,
  );
}
await page.evaluate(async () => {
  const s = await (await fetch("api.php?action=session")).json();
  const tag = Date.now().toString(36);
  const r = await fetch("api.php?action=register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrf },
    body: JSON.stringify({
      name: "Responsive Player",
      username: "layout_" + tag,
      email: "layout_" + tag + "@example.com",
      password: crypto.randomUUID(),
    }),
  });
  if (!r.ok) throw Error(JSON.stringify(await r.json()));
});
await page.reload();
await page.getByLabel("Your post", { exact: true }).waitFor();
for (const width of [320, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const view of ["home", "profile", "settings", "activity"]) {
    await page.evaluate(async (view) => {
      if (view === "settings" || view === "activity") {
        await extraAction(view, document.body, 0);
      } else {
        globalThis.document.querySelector(`[data-action="${view}"]`).click();
      }
    }, view);
    if (view === "home")
      await page.getByLabel("Your post", { exact: true }).waitFor();
    if (view === "profile")
      await page.getByRole("button", { name: "Edit profile" }).waitFor();
    if (view === "settings")
      await page
        .getByRole("heading", { name: "Your Hub. Your way." })
        .waitFor();
    if (view === "activity")
      await page
        .getByRole("heading", { name: "What’s happening around you." })
        .waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      view + " overflow at " + width,
    );
  }
}
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: login, feed, profile, settings and activity without horizontal overflow at 320, 390, 768, 1024 and 1440px.",
);
