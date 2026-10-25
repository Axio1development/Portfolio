import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import { screenshotPath } from "./artifacts.mjs";
const mediaFolder = "axiomate-hub/qa/runtime-video/videos";
const initialFiles = fs.existsSync(mediaFolder)
  ? fs.readdirSync(mediaFolder).sort()
  : [];
const browser = await chromium.launch();
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://localhost:8787";
await page.goto(base);
async function api(action, data, expected = 200, params = {}) {
  const response = await page.evaluate(
    async ({ action, data, params }) => {
      const s = await (await fetch("api.php?action=session")).json();
      const r = await fetch(
        "api.php?" + new URLSearchParams({ action, ...params }),
        {
          method: data ? "POST" : "GET",
          headers: data
            ? { "Content-Type": "application/json", "X-CSRF-Token": s.csrf }
            : {},
          body: data ? JSON.stringify(data) : undefined,
        },
      );
      return { status: r.status, data: await r.json() };
    },
    { action, data, params },
  );
  assert.equal(response.status, expected, JSON.stringify(response));
  return response.data;
}
const tag = Date.now().toString(36);
await api("register", {
  name: "Video Creator",
  username: "video_" + tag,
  email: "video_" + tag + "@example.com",
  password: crypto.randomUUID(),
});
await page.reload();
await page.getByLabel("Your post", { exact: true }).waitFor();
const recording = await page.evaluate(async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const context = canvas.getContext("2d"),
    stream = canvas.captureStream(12);
  const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
    }),
    chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise((resolve) => (recorder.onstop = resolve));
  recorder.start();
  let n = 0;
  const timer = setInterval(() => {
    context.fillStyle = "#171022";
    context.fillRect(0, 0, 640, 360);
    context.fillStyle = "#ba93ff";
    context.font = "bold 42px Arial";
    context.fillText("AXIOMATE GAMES", 90, 160);
    context.fillStyle = "#53d4d0";
    context.fillRect(80 + n * 7, 230, 100, 8);
    n++;
  }, 80);
  await new Promise((r) => setTimeout(r, 1200));
  recorder.stop();
  await done;
  clearInterval(timer);
  stream.getTracks().forEach((t) => t.stop());
  return Array.from(
    new Uint8Array(
      await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
    ),
  );
});
const buffer = Buffer.from(recording);
await page
  .locator("#video-file")
  .setInputFiles({
    name: "axiomate-clip.webm",
    mimeType: "video/webm",
    buffer,
  });
await page.getByLabel("Attached video preview", { exact: true }).waitFor();
assert.equal(
  await page.getByLabel("Your post", { exact: true }).getAttribute("required"),
  null,
);
await page
  .getByLabel("Your post", { exact: true })
  .fill("A new chapter in motion. #AxiomateGames");
await page.locator('#post-form button[type="submit"]').click();
await page.locator("#post-list .post-video video").first().waitFor();
let [post] = await api("feed");
assert.ok(post.video);
assert.equal(post.video.mime, "video/webm");
assert.equal(post.video.bytes, buffer.length);
const url = base + "/" + post.video.url;
let r = await page.request.get(url);
assert.equal(r.status(), 200);
assert.deepEqual(await r.body(), buffer);
r = await page.request.get(url, { headers: { Range: "bytes=0-31" } });
assert.equal(r.status(), 206);
assert.equal(r.headers()["content-range"], `bytes 0-31/${buffer.length}`);
assert.deepEqual(await r.body(), buffer.subarray(0, 32));
r = await page.request.get(url, { headers: { Range: "bytes=-16" } });
assert.equal(r.status(), 206);
assert.deepEqual(await r.body(), buffer.subarray(-16));
r = await page.request.get(url, { headers: { Range: "bytes=999999999-" } });
assert.equal(r.status(), 416);
r = await page.request.head(url);
assert.equal(r.status(), 200);
assert.equal(Number(r.headers()["content-length"]), buffer.length);
assert.equal((await r.body()).length, 0);
const anonymous = await browser.newContext();
assert.equal((await anonymous.request.get(url)).status(), 401);
const player = page.locator("#post-list .post-video video").first();
await player.evaluate((video) => video.play());
await page.waitForFunction(
  () =>
    document.querySelector("#post-list .post-video video").currentTime > 0.1,
);
await player.evaluate((v) => v.pause());
await page.screenshot({
  path: screenshotPath("video-feed-desktop.png"),
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.screenshot({
  path: screenshotPath("video-feed-mobile.png"),
  fullPage: true,
});
await page
  .locator("#video-file")
  .setInputFiles({ name: "second.webm", mimeType: "video/webm", buffer });
await page.getByLabel("Attached video preview", { exact: true }).waitFor();
await page.getByRole("button", { name: "Remove", exact: true }).click();
assert.equal(await page.locator(".video-draft").count(), 0);
assert.notEqual(
  await page.getByLabel("Your post", { exact: true }).getAttribute("required"),
  null,
);
await page
  .locator("#video-file")
  .setInputFiles({ name: "second.webm", mimeType: "video/webm", buffer });
await page.getByLabel("Attached video preview", { exact: true }).waitFor();
await page.locator('#post-form button[type="submit"]').click();
await page.waitForFunction(
  (id) =>
    Number(document.querySelector("#post-list .post")?.dataset.post) !== id,
  post.id,
);
const [second] = await api("feed");
assert.equal(second.body, "");
const spoof = await page.evaluate(async () => {
  const s = await (await fetch("api.php?action=session")).json(),
    body = new FormData();
  body.append(
    "video",
    new Blob(['<?php echo "bad"; ?>'], { type: "video/mp4" }),
    "fake.mp4",
  );
  return (
    await fetch("api.php?action=video-post", {
      method: "POST",
      headers: { "X-CSRF-Token": s.csrf },
      body,
    })
  ).status;
});
assert.equal(spoof, 400);
const noCsrf = await page.request.post(base + "/api.php?action=video-post", {
  multipart: { video: { name: "clip.webm", mimeType: "video/webm", buffer } },
});
assert.equal(noCsrf.status(), 403);
const csrf = (await api("session")).csrf;
const oversized = await page.request.post(base + "/api.php?action=video-post", {
  headers: { "X-CSRF-Token": csrf },
  multipart: {
    video: {
      name: "too-large.webm",
      mimeType: "video/webm",
      buffer: Buffer.alloc(50 * 1024 * 1024 + 1),
    },
  },
});
assert.equal(oversized.status(), 413);
const otherPage = await anonymous.newPage();
await otherPage.goto(base);
await otherPage.evaluate(async (tag) => {
  const s = await (await fetch("api.php?action=session")).json();
  await fetch("api.php?action=register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrf },
    body: JSON.stringify({
      name: "Other Member",
      username: "watch_" + tag,
      email: "watch_" + tag + "@example.com",
      password: crypto.randomUUID(),
    }),
  });
}, tag);
await otherPage.reload();
await otherPage.getByLabel("Your post", { exact: true }).waitFor();
await otherPage.evaluate(async (id) => {
  const s = await (await fetch("api.php?action=session")).json();
  await fetch("api.php?action=delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrf },
    body: JSON.stringify({ id }),
  });
}, post.id);
assert.equal((await page.request.get(url)).status(), 200);
await api("delete", { id: post.id });
assert.equal((await page.request.get(url)).status(), 404);
await api("delete", { id: second.id });
assert.ok(
  !(await api("feed")).some((p) => [post.id, second.id].includes(p.id)),
);
assert.deepEqual(fs.readdirSync(mediaFolder).sort(), initialFiles);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: real video upload and playback, captions and captionless posts, previews/removal, feed persistence, byte ranges/seeking, HEAD, login/CSRF/ownership protection, spoof rejection, mobile layout, and media cleanup.",
);
