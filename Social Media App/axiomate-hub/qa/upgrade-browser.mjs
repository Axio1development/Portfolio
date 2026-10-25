import { screenshotPath } from "./artifacts.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = "http://localhost:8787";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("status of 4"))
    console.log("Browser:", m.text());
});
const cdp = await context.newCDPSession(page);
await cdp.send("WebAuthn.enable");
const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: {
    protocol: "ctap2",
    transport: "internal",
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
  },
});
const tag = Date.now().toString(36),
  username = "upgrade_" + tag,
  password = "Testing-passkeys-" + crypto.randomUUID();
const email = username + "@example.com",
  newEmail = email;
const request = async (action, data, expected = 200) => {
  const result = await page.evaluate(
    async ({ action, data }) => {
      const session = await (await fetch("api.php?action=session")).json();
      const res = await fetch("api.php?action=" + action, {
        method: data ? "POST" : "GET",
        headers: data
          ? { "Content-Type": "application/json", "X-CSRF-Token": session.csrf }
          : {},
        body: data ? JSON.stringify(data) : undefined,
      });
      return { status: res.status, data: await res.json() };
    },
    { action, data },
  );
  assert.equal(result.status, expected, JSON.stringify(result));
  return result.data;
};
await page.goto(base);
await page.getByRole("button", { name: "Sign in with a passkey" }).waitFor();
await page.screenshot({
  path: screenshotPath("v2-login-desktop.png"),
  fullPage: true,
});
await page.getByRole("button", { name: "Create account", exact: true }).click();
await page.getByLabel("Display name", { exact: true }).fill("Shadow Monarch");
await page.getByLabel("Username", { exact: true }).fill(username);
await page.getByLabel("Email address", { exact: true }).fill(email);
await page.getByLabel("Password", { exact: true }).fill(password);
await page.getByRole("button", { name: "Join the shadows" }).click();
await page.getByLabel("Your post", { exact: true }).waitFor();
await page
  .getByLabel("Your post", { exact: true })
  .fill("A draft from the shadows.");
await page.reload();
await page.getByLabel("Your post", { exact: true }).waitFor();
assert.equal(
  await page.getByLabel("Your post", { exact: true }).inputValue(),
  "A draft from the shadows.",
);
await page.getByRole("button", { name: "Add emoji" }).click();
await page.getByRole("button", { name: "Insert 🎮", exact: true }).click();
await page.getByLabel("Your post", { exact: true }).press("Control+Enter");
await page.locator("#post-list .post").first().waitFor();
await page
  .getByRole("button", { name: "Settings", exact: true })
  .first()
  .click();
await page.getByRole("heading", { name: "Your Hub. Your way." }).waitFor();
assert.equal(
  await page
    .locator('[data-settings-form="account-update"] [name="email"]')
    .inputValue(),
  email,
);
assert.equal((await request("settings")).account.email, newEmail);
const appearance = page.locator('[data-settings-form="preferences"]');
await appearance.getByLabel("Amethyst", { exact: true }).check();
await appearance.getByLabel("Feed spacing").selectOption("compact");
await appearance.getByLabel("Reduce animations").check();
await appearance.getByRole("button", { name: "Save appearance" }).click();
await page.waitForFunction(
  () => document.documentElement.dataset.theme === "amethyst",
);
await page.getByRole("button", { name: "Add a passkey", exact: true }).click();
await page.getByLabel("Passkey name", { exact: true }).fill("Test device");
await page.locator("dialog").getByLabel("Current password").fill(password);
await page.getByRole("button", { name: "Continue to device" }).click();
await page
  .locator(".passkey-row")
  .getByText("Test device", { exact: true })
  .waitFor();
assert.equal((await request("settings")).passkeys.length, 1);
const member = await request("member");
assert.equal(member.email, undefined);
await page.screenshot({
  path: screenshotPath("v2-settings-desktop.png"),
  fullPage: true,
});
await page
  .getByRole("button", { name: "Sign out", exact: true })
  .first()
  .click();
await page.getByRole("button", { name: "Sign in with a passkey" }).waitFor();
await page.getByRole("button", { name: "Sign in with a passkey" }).click();
await page.getByLabel("Your post", { exact: true }).waitFor();
assert.equal((await request("settings")).account.email, newEmail);
assert.equal(
  await page.evaluate(() => document.documentElement.dataset.theme),
  "amethyst",
);
await page
  .getByLabel("Your post", { exact: true })
  .fill("Arise together. #AxiomateGames");
await page.locator("#post-form").getByRole("button", { name: "Post" }).click();
await page
  .locator("#post-list .post-body")
  .first()
  .getByText("Arise together.", { exact: false })
  .waitFor();
const postId = Number(
  await page.locator("#post-list .post").first().getAttribute("data-post"),
);
const ctx2 = await browser.newContext();
const pg2 = await ctx2.newPage();
await pg2.goto(base);
await pg2.evaluate(
  async ({ username, password }) => {
    let s = await (await fetch("api.php?action=session")).json();
    await fetch("api.php?action=register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrf },
      body: JSON.stringify({
        name: "Party Member",
        username: "party_" + username,
        email: "party_" + username + "@example.com",
        password,
      }),
    });
  },
  { username: tag, password },
);
await pg2.reload();
await pg2.locator("#post-list .post").first().waitFor();
await pg2
  .locator(`#post-list .post[data-post="${postId}"]`)
  .getByRole("button", { name: "Like post", exact: true })
  .click();
await pg2
  .locator(`#post-list .post[data-post="${postId}"]`)
  .getByRole("button", { name: "Unlike post", exact: true })
  .waitFor();
await pg2
  .locator(`#post-list .post[data-post="${postId}"]`)
  .getByRole("button", { name: "Bookmark post", exact: true })
  .click();
await pg2
  .locator(`#post-list .post[data-post="${postId}"]`)
  .getByRole("button", { name: "Remove bookmark", exact: true })
  .waitFor();
await pg2
  .locator(`#post-list .post[data-post="${postId}"]`)
  .getByRole("button", { name: "Reply to post" })
  .click();
await pg2.getByLabel("Your reply").fill("The party has arrived.");
await pg2.locator("#reply-form button").click();
await pg2
  .locator("#replies")
  .getByText("The party has arrived.", { exact: true })
  .waitFor();
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Activity", exact: true })
  .click();
await page.getByText("liked your post", { exact: false }).waitFor();
await page.getByRole("button", { name: "Mark all read" }).click();
assert.equal((await request("notifications")).unread, 0);
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Home", exact: true })
  .click();
await page.getByLabel("Your post", { exact: true }).waitFor();
await page.screenshot({
  path: screenshotPath("v2-feed-desktop.png"),
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.screenshot({
  path: screenshotPath("v2-feed-mobile.png"),
  fullPage: true,
});
await page
  .locator(".mobile-nav")
  .getByRole("button", { name: "Settings", exact: true })
  .click();
await page.getByRole("heading", { name: "Your Hub. Your way." }).waitFor();
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.screenshot({
  path: screenshotPath("v2-settings-mobile.png"),
  fullPage: true,
});
const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Export my data" }).click();
assert.ok((await download).suggestedFilename().endsWith(".json"));
await request(
  "account-update",
  { email: "wrong@example.com", current_password: "wrong" },
  403,
);
await request(
  "passkey-register-options",
  { label: "blocked", current_password: "wrong" },
  403,
);
await request("passkey-login-options", {});
const fakeClient = Buffer.from(
  JSON.stringify({
    type: "webauthn.get",
    origin: "https://evil.example",
    challenge: "invalid",
  }),
).toString("base64url");
await request("passkey-login-finish", { clientDataJSON: fakeClient }, 403);
await request("passkey-login-finish", { clientDataJSON: fakeClient }, 403);
const key = (await request("settings")).passkeys[0];
await page.getByRole("button", { name: "Remove", exact: true }).click();
await page.locator("dialog").getByLabel("Current password").fill(password);
await page.getByRole("button", { name: "Remove passkey", exact: true }).click();
await page.getByText("No passkeys yet.", { exact: false }).waitFor();
assert.equal((await request("settings")).passkeys.length, 0);
const ctx3 = await browser.newContext();
const pg3 = await ctx3.newPage();
await pg3.goto(base);
await pg3.getByLabel("Username or email").fill(newEmail);
await pg3.getByLabel("Password", { exact: true }).fill(password);
await pg3.getByRole("button", { name: "Enter the Hub" }).click();
await pg3.getByLabel("Your post", { exact: true }).waitFor();
const passForm = page.locator('[data-settings-form="password-update"]');
await passForm.getByLabel("Current password", { exact: true }).fill(password);
await passForm
  .getByLabel("New password", { exact: true })
  .fill(password + "new");
await passForm
  .getByLabel("Confirm new password", { exact: true })
  .fill(password + "new");
await passForm.getByRole("button", { name: "Update password" }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Password updated." })
  .waitFor();
assert.equal(
  (await pg3.request.get(base + "/api.php?action=feed")).status(),
  401,
);
assert.equal((await request("settings")).preferences.density, "compact");
assert.deepEqual(errors, []);
console.log(
  "PASS: upgraded UI, saved drafts, emojis, account email, appearance persistence, real WebAuthn registration/login/removal, activity, reactions, exports, mobile layout, password rotation, session revocation, origin checks and single-use challenges.",
);
await browser.close();
