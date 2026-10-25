import { screenshotPath } from "./artifacts.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const origin = "https://axiomatehub.com";
for (const asset of [
  "app.js",
  "enhancements.js",
  "refinements.css",
  "profile.js",
  "profile.css",
  "video.js",
  "video.css",
]) {
  const res = await fetch(origin + "/" + asset + "?check=" + Date.now());
  assert.equal(res.status, 200);
  assert.equal(
    await res.text(),
    fs.readFileSync("axiomate-hub/public/" + asset, "utf8"),
  );
  console.log(asset, "matches deployed source");
}
const s = await fetch(origin + "/api.php?action=session");
assert.equal(s.status, 200);
const session = await s.json();
assert.equal(session.user, null);
assert.ok(
  s.headers
    .getSetCookie()
    .some((c) => /httponly/i.test(c) && /secure/i.test(c)),
);
for (const action of ["feed", "settings", "notifications", "export"])
  assert.equal((await fetch(origin + "/api.php?action=" + action)).status, 401);
assert.equal(
  (
    await fetch(origin + "/api.php?action=preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
  ).status,
  403,
);
assert.equal((await fetch(origin + "/vendor/webauthn/LICENSE")).status, 403);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(origin);
await page.getByRole("button", { name: "Sign in with a passkey" }).waitFor();
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
const options = await page.evaluate(async () => {
  const s = await (await fetch("api.php?action=session")).json();
  const r = await fetch("api.php?action=passkey-login-options", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrf },
    body: "{}",
  });
  return { status: r.status, options: await r.json() };
});
assert.equal(options.status, 200);
assert.equal(options.options.publicKey.rpId, "axiomatehub.com");
assert.equal(options.options.publicKey.userVerification, "required");
await page.screenshot({
  path: screenshotPath("v2-production-mobile.png"),
  fullPage: true,
});
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: deployed assets, HTTPS secure sessions, private APIs, CSRF, vendor protection, mobile login and production passkey options.",
);
