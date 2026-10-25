import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { screenshotPath } from "./artifacts.mjs";
const root = process.cwd(),
  runtime = path.join(root, "axiomate-hub/qa/runtime-profile");
const php = execFileSync("php", ["-r", "echo PHP_BINARY;"], {
  encoding: "utf8",
}).trim();
function fixture(sql) {
  execFileSync(php, [
    "-d",
    "extension_dir=" + path.dirname(php) + "/ext",
    "-d",
    "extension=pdo_sqlite",
    "-r",
    `$db=new PDO('sqlite:'.${JSON.stringify(runtime.replaceAll("\\", "/"))}.'/hub.sqlite');$db->exec(${JSON.stringify(sql)});`,
  ]);
}
const browser = await chromium.launch();
const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  }),
  page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const tag = Date.now().toString(36),
  username = "profile_" + tag,
  email = username + "@example.com",
  password = "Local-profile-" + crypto.randomUUID(),
  newEmail = "new_" + email;
await page.goto("http://localhost:8787");
async function api(action, data, expected = 200, params = {}) {
  const result = await page.evaluate(
    async ({ action, data, params }) => {
      const session = await (await fetch("api.php?action=session")).json();
      const res = await fetch(
        "api.php?" + new URLSearchParams({ action, ...params }),
        {
          method: data ? "POST" : "GET",
          headers: data
            ? {
                "Content-Type": "application/json",
                "X-CSRF-Token": session.csrf,
              }
            : {},
          body: data ? JSON.stringify(data) : undefined,
        },
      );
      return { status: res.status, data: await res.json() };
    },
    { action, data, params },
  );
  assert.equal(result.status, expected, JSON.stringify(result));
  return result.data;
}
function mail(to) {
  return fs
    .readFileSync(runtime + "/mail-capture.jsonl", "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse)
    .filter((m) => m.to === to)
    .at(-1);
}
const token = (link) => new URL(link).hash.split("=")[1];
await api("register", { name: "Shadow Artist", username, email, password });
await page.reload();
await page.getByLabel("Your post", { exact: true }).waitFor();
const id = (await api("session")).user.id;
assert.equal((await api("settings")).account.email_verified, false);
const firstLink = mail(email).link;
const anonymous = await browser.newContext(),
  confirmPage = await anonymous.newPage();
await confirmPage.goto(firstLink);
await confirmPage
  .getByRole("heading", { name: "Confirm your email." })
  .waitFor();
assert.equal(
  (await api("settings")).account.email_verified,
  false,
  "GET must not verify email",
);
await confirmPage
  .getByRole("button", { name: "Confirm email", exact: true })
  .click();
await confirmPage
  .getByRole("status")
  .filter({ hasText: "Email verified." })
  .waitFor();
assert.equal((await api("settings")).account.email_verified, true);
await api("verification-confirm", { token: token(firstLink) }, 400);
await page
  .getByRole("button", { name: "Settings", exact: true })
  .first()
  .click();
await page.getByRole("heading", { name: "Your Hub. Your way." }).waitFor();
const form = page.locator('[data-settings-form="profile"]');
await form.getByLabel("Display name", { exact: true }).fill("Shadow Designer");
await form
  .getByLabel("Tagline", { exact: true })
  .fill("Build worlds. Break limits.");
await form.getByLabel("Bio", { exact: true }).fill("Creating in the shadows.");
await form.getByLabel("Pronouns", { exact: true }).fill("they/them");
await form.getByLabel("Location", { exact: true }).fill("Los Angeles");
await form
  .getByLabel("Website", { exact: true })
  .fill("https://axiomategames.com");
await form.getByLabel("Favorite game", { exact: true }).fill("Axiomate Worlds");
await form.getByLabel("Cyan", { exact: true }).check();
await form.getByLabel("Cover style").selectOption("frost");
assert.equal(
  await form.locator("[data-preview-name]").textContent(),
  "Shadow Designer",
);
const data = await page.evaluate(() => {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 500;
  const c = canvas.getContext("2d");
  const g = c.createLinearGradient(0, 0, 800, 500);
  g.addColorStop(0, "#6034a8");
  g.addColorStop(1, "#26bed0");
  c.fillStyle = g;
  c.fillRect(0, 0, 800, 500);
  c.fillStyle = "#fff";
  c.font = "bold 200px Arial";
  c.fillText("A", 300, 320);
  return canvas.toDataURL("image/png").split(",")[1];
});
const image = {
  name: "custom.png",
  mimeType: "image/png",
  buffer: Buffer.from(data, "base64"),
};
await form.locator('[name="avatar_file"]').setInputFiles(image);
await form.locator(".profile-preview .avatar img").waitFor();
await form.locator('[name="banner_file"]').setInputFiles(image);
await form.locator(".profile-preview .cover-image").waitFor();
assert.equal(
  (await api("settings")).account.avatar_url,
  null,
  "Images stay staged until save",
);
await form.getByRole("button", { name: "Save profile", exact: true }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Your profile is ready" })
  .waitFor();
let account = (await api("settings")).account;
assert.equal(account.name, "Shadow Designer");
assert.equal(account.tagline, "Build worlds. Break limits.");
assert.equal(account.accent, "cyan");
assert.equal(account.cover, "frost");
assert.ok(account.avatar_url && account.banner_url);
const imageResponse = await page.request.get(
  "http://localhost:8787/" + account.avatar_url,
);
assert.equal(imageResponse.status(), 200);
assert.equal(imageResponse.headers()["content-type"], "image/jpeg");
const unauth = await anonymous.request.get(
  "http://localhost:8787/" + account.avatar_url,
);
assert.equal(unauth.status(), 401);
const member = await api("member", null, 200, { id });
assert.equal(member.email, undefined);
assert.equal(member.pending_email, undefined);
assert.equal(member.favorite_game, "Axiomate Worlds");
assert.equal(member.avatar_url, account.avatar_url);
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Profile", exact: true })
  .click();
await page.getByRole("button", { name: "Edit profile" }).waitFor();
await page.getByText("Los Angeles", { exact: false }).waitFor();
await page
  .locator(".profile-card .custom-cover")
  .getByText("Build worlds. Break limits.", { exact: true })
  .waitFor();
assert.equal(
  await page.locator(".profile-card").getAttribute("data-accent"),
  "cyan",
);
await page.waitForFunction(
  () => document.querySelector(".profile-card .cover-image")?.naturalWidth > 0,
);
await page.screenshot({
  path: screenshotPath("custom-profile-desktop.png"),
  fullPage: true,
});
for (const width of [320, 390, 768]) {
  await page.setViewportSize({ width, height: 900 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Profile overflow at " + width,
  );
}
await page.screenshot({
  path: screenshotPath("custom-profile-mobile.png"),
  fullPage: true,
});
await api(
  "profile",
  { name: "Shadow Designer", bio: "", website: "javascript:alert(1)" },
  400,
);
await api(
  "profile-image",
  { kind: "avatar", data: "data:image/svg+xml;base64,PHN2Zz4=" },
  400,
);
await page.setViewportSize({ width: 390, height: 844 });
await page
  .getByRole("button", { name: "Settings", exact: true })
  .first()
  .click();
await page.getByRole("heading", { name: "Your Hub. Your way." }).waitFor();
fixture(`UPDATE email_verifications SET sent_at=0 WHERE user_id=${id}`);
const emailForm = page.locator('[data-settings-form="account-update"]');
await emailForm.getByLabel("New email address", { exact: true }).fill(newEmail);
await emailForm.getByLabel("Current password", { exact: true }).fill(password);
await emailForm.getByRole("button", { name: "Send confirmation link" }).click();
await page.getByText("Check " + newEmail, { exact: true }).waitFor();
account = (await api("settings")).account;
assert.equal(account.email, email);
assert.equal(account.pending_email, newEmail);
assert.equal(account.email_verified, true);
const pending = mail(newEmail).link;
await api("verification-send", {}, 429);
await api("verification-cancel", {});
await api("verification-confirm", { token: token(pending) }, 400);
assert.equal((await api("settings")).account.email, email);
await api("account-update", { email: newEmail, current_password: password });
const expired = mail(newEmail).link;
fixture(
  `UPDATE email_verifications SET expires=0,sent_at=0 WHERE user_id=${id}`,
);
await api("verification-confirm", { token: token(expired) }, 400);
await api("account-update", { email: newEmail, current_password: password });
const valid = mail(newEmail).link;
await api("verification-confirm", { token: token(valid) });
account = (await api("settings")).account;
assert.equal(account.email, newEmail);
assert.equal(account.pending_email, null);
assert.equal(account.email_verified, true);
await api("verification-confirm", { token: token(valid) }, 400);
await page.reload();
await page.getByLabel("Your post", { exact: true }).waitFor();
assert.equal(await page.locator(".verification-banner").count(), 0);
await page
  .getByRole("button", { name: "Settings", exact: true })
  .first()
  .click();
await page.getByText("✓ Email verified", { exact: true }).waitFor();
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.screenshot({
  path: screenshotPath("profile-settings-mobile.png"),
  fullPage: true,
});
await api("profile-image", { kind: "avatar", remove: true });
assert.equal((await api("settings")).account.avatar_url, null);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: avatar/cover uploads and removal, live profile preview, saved fields, private media, public profile privacy, mobile layout, automatic verification email, logged-out confirmation, expiry/replay/cooldown, pending/cancelled email changes, and confirmed address replacement.",
);
