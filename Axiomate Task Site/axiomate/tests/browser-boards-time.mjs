import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const temporary = await mkdtemp(path.join(os.tmpdir(), "axiomate-browser-"));
const php =
  process.platform === "win32"
    ? execFileSync("where.exe", ["php"], { encoding: "utf8" })
        .trim()
        .split(/\r?\n/)[0]
    : "php";
const args =
  process.platform === "win32"
    ? [
        "-d",
        `extension_dir=${path.dirname(php)}/ext`,
        "-d",
        "extension=pdo_sqlite",
        "-d",
        "extension=fileinfo",
      ]
    : [];
const server = spawn(php, [...args, "-S", "127.0.0.1:8081", "-t", "dist"], {
  env: { ...process.env, AXIOMATE_DATA_DIR: temporary },
  stdio: "ignore",
});

let browser;
try {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch("http://127.0.0.1:8081/api.php?action=state")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const leadContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    memberContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
  const lead = await leadContext.newPage(),
    member = await memberContext.newPage();
  lead.setDefaultTimeout(10000);
  member.setDefaultTimeout(10000);
  const errors = [];
  lead.on("pageerror", (e) => errors.push(e.message));
  member.on("pageerror", (e) => errors.push(e.message));
  async function signup(page, name, email) {
    await page
      .getByRole("button", { name: "New here? Create an account" })
      .click();
    await page.getByLabel("Your name").fill(name);
    await page.getByLabel("Email address").fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("BrowserPassword123!");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
  }
  await lead.goto("http://127.0.0.1:8081");
  await signup(lead, "Studio lead", "lead@example.test");
  await lead.getByRole("button", { name: "Choose Starter" }).click();
  await lead.getByLabel("Workspace name").fill("Custom studio");
  await lead
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await lead.getByRole("button", { name: "Create board", exact: true }).click();
  await lead.getByLabel("Board name").fill("Game production");
  await lead
    .getByRole("dialog", { name: "Create board", exact: true })
    .getByRole("button", { name: "Create board", exact: true })
    .click();
  await lead
    .getByRole("button", { name: "Add first column", exact: true })
    .click();
  await lead.getByLabel("Column name").fill("Development");
  await lead
    .getByRole("button", { name: "Create column", exact: true })
    .click();
  await lead.getByRole("button", { name: "Add column", exact: true }).click();
  await lead.getByLabel("Column name").fill("Audio");
  await lead
    .getByRole("button", { name: "Create column", exact: true })
    .click();
  for (const [title, due, price] of [
    ["Later task", "2026-12-20", "125.00"],
    ["Earlier task", "2026-11-01", "200.00"],
  ]) {
    await lead
      .getByRole("button", { name: "Create task", exact: true })
      .click();
    await lead.getByLabel("Task name").fill(title);
    await lead.getByLabel("Due date").fill(due);
    await lead.getByLabel("Task price / USD", { exact: true }).fill(price);
    await lead.getByRole("button", { name: "Save task", exact: true }).click();
    await lead.getByRole("heading", { name: title, exact: true }).waitFor();
  }
  await lead
    .getByRole("heading", { name: "Earlier task", exact: true })
    .click();
  await lead
    .getByLabel("Reference title (optional)", { exact: true })
    .fill("Color direction");
  await lead
    .getByLabel("Reference image or video", { exact: true })
    .setInputFiles({
      name: "direction.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await lead
    .getByRole("button", { name: "Add reference", exact: true })
    .click();
  await lead
    .locator(".reference-caption")
    .getByText("Color direction", { exact: true })
    .waitFor();
  await lead
    .getByLabel("Reference title (optional)", { exact: true })
    .fill("Motion example");
  await lead
    .getByLabel("Reference image or video", { exact: true })
    .setInputFiles("tests/fixtures/reference.mp4");
  await lead
    .getByRole("button", { name: "Add reference", exact: true })
    .click();
  await lead
    .locator(".reference-caption")
    .getByText("Motion example", { exact: true })
    .waitFor();
  await lead.locator(".task-references video").evaluate(async (video) => {
    await video.play();
    video.pause();
    if (!video.videoWidth) throw Error("Reference video did not decode");
  });
  await lead
    .getByLabel("Reference title (optional)", { exact: true })
    .fill("Creative brief");
  await lead
    .getByLabel("Or add a reference link", { exact: true })
    .fill("https://example.com/brief");
  await lead
    .getByRole("button", { name: "Add reference", exact: true })
    .click();
  await lead
    .locator(".reference-caption")
    .getByText("Creative brief", { exact: true })
    .waitFor();
  await mkdir("artifacts", { recursive: true });
  await lead
    .locator(".task-references")
    .screenshot({ path: "artifacts/task-references.png" });
  await lead.getByRole("button", { name: "Close", exact: true }).click();
  const titles = await lead
    .locator(".custom-kanban .task-card h3")
    .allTextContents();
  if (titles.join(",") !== "Earlier task,Later task")
    throw Error("Tasks are not due-date sorted");
  await lead
    .locator(".board-cost")
    .getByText("$325.00", { exact: true })
    .waitFor();
  await mkdir("artifacts", { recursive: true });
  await lead.screenshot({
    path: "artifacts/custom-priced-board.png",
    fullPage: true,
  });
  await lead
    .locator(".sidebar")
    .getByRole("button", { name: "Team", exact: true })
    .click();
  await lead
    .getByLabel("Email address", { exact: true })
    .fill("dev@example.test");
  await lead.getByLabel("Role", { exact: true }).selectOption("developer");
  await lead.getByRole("button", { name: "Create invitation link" }).click();
  const invite = lead.getByLabel("Invitation link");
  await invite.waitFor();
  await member.goto(await invite.inputValue());
  await signup(member, "Developer", "dev@example.test");
  await member.getByRole("button", { name: "Accept invitation" }).click();
  await member
    .getByRole("heading", { name: "Custom studio", exact: true })
    .waitFor();
  await member
    .locator(".sidebar")
    .getByRole("button", { name: "Clock in", exact: true })
    .click();
  await member.locator(".clock-not-approved").waitFor();
  if (
    !(await member
      .locator(".clock-panel")
      .getByRole("button", { name: "Clock in", exact: true })
      .isDisabled())
  )
    throw Error("Unapproved task can start timer");
  await member
    .locator(".sidebar")
    .getByRole("button", { name: "Board", exact: true })
    .click();
  await member
    .getByRole("heading", { name: "Earlier task", exact: true })
    .click();
  await member.locator(".task-references img").waitFor();
  if (!(await member.getByLabel("Status", { exact: true }).isDisabled()))
    throw Error("Contributor can change task status");
  if (
    await member
      .getByRole("button", { name: "Add reference", exact: true })
      .count()
  )
    throw Error("Contributor can edit references");
  await member.setViewportSize({ width: 390, height: 844 });
  await member
    .locator(".task-references")
    .screenshot({ path: "artifacts/task-references-mobile.png" });
  if (
    await member.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw Error("Reference task overflows mobile");
  await member.getByRole("button", { name: "Close", exact: true }).click();
  await member.setViewportSize({ width: 1440, height: 1000 });
  await lead.reload();
  await lead
    .getByRole("heading", { name: "Earlier task", exact: true })
    .click();
  await lead
    .getByLabel("Assigned individual")
    .selectOption({ label: "Developer (developer)" });
  await lead.getByLabel("Pricing type", { exact: true }).selectOption("hourly");
  await lead.getByLabel("Planned hours", { exact: true }).fill("1");
  await lead.getByLabel("Hourly rate / USD", { exact: true }).fill("200");
  await lead.getByRole("button", { name: "Save task", exact: true }).click();
  await lead
    .getByRole("heading", { name: "Earlier task", exact: true })
    .click();
  await lead
    .getByRole("button", { name: "Approve task for clock-in", exact: true })
    .click();
  await lead
    .getByRole("button", { name: "Revoke clock approval", exact: true })
    .waitFor();
  await lead.screenshot({
    path: "artifacts/task-clock-approval.png",
    fullPage: true,
  });
  await lead.getByRole("button", { name: "Close", exact: true }).click();
  await member.reload();
  if (
    await member
      .locator(".sidebar")
      .getByRole("button", { name: "Management", exact: true })
      .count()
  )
    throw Error("Regular member sees management navigation");
  await member
    .locator(".sidebar")
    .getByRole("button", { name: "Clock in", exact: true })
    .click();
  await member
    .locator(".clock-panel")
    .getByRole("button", { name: "Clock in", exact: true })
    .click();
  await member.getByText("Clocked in", { exact: true }).waitFor();
  await member
    .locator(".active-task-rate")
    .getByText("$200.00/hour", { exact: true })
    .waitFor();
  await member
    .locator(".shift-duration")
    .getByText("Earlier task / Game production", { exact: true })
    .waitFor();
  await member.screenshot({
    path: "artifacts/circular-digital-clock.png",
    fullPage: true,
  });
  await member.reload();
  await member
    .locator(".sidebar")
    .getByRole("button", { name: "Clock in", exact: true })
    .click();
  await member
    .locator(".clock-panel")
    .getByRole("button", { name: "Clock out", exact: true })
    .waitFor();
  await member.setViewportSize({ width: 390, height: 844 });
  await member.screenshot({
    path: "artifacts/circular-clock-mobile.png",
    fullPage: true,
  });
  if (
    await member.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw Error("Clock screen overflows mobile");
  await lead
    .locator(".sidebar")
    .getByRole("button", { name: "Management", exact: true })
    .click();
  await lead
    .getByRole("button", { name: "Force clock out", exact: true })
    .waitFor();
  await lead.screenshot({
    path: "artifacts/board-management.png",
    fullPage: true,
  });
  lead.once("dialog", (dialog) =>
    dialog.accept("Forgot to clock out overnight"),
  );
  await lead
    .getByRole("button", { name: "Force clock out", exact: true })
    .click();
  await lead.getByText("Nobody is clocked in to this board.").waitFor();
  await lead.getByRole("button", { name: "Adjust time", exact: true }).click();
  const localValue = new Date(
    Date.now() - 60000 - new Date().getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 19);
  await lead.getByLabel("Clock-in time", { exact: true }).fill(localValue);
  await lead
    .getByLabel("Reason for correction")
    .fill("Corrected confirmed time after overnight clock-out");
  await lead
    .getByRole("button", { name: "Save time correction", exact: true })
    .click();
  await lead
    .getByText("Corrected confirmed time after overnight clock-out", {
      exact: true,
    })
    .waitFor();
  lead.once("dialog", (dialog) =>
    dialog.accept("Access removed for this production board"),
  );
  await lead
    .getByRole("button", { name: "Remove access", exact: true })
    .click();
  await lead
    .getByRole("button", { name: "Restore access", exact: true })
    .waitFor();
  await member.reload();
  await member
    .getByRole("heading", { name: "No boards yet.", exact: true })
    .waitFor();
  if (
    await member
      .getByRole("heading", { name: "Earlier task", exact: true })
      .count()
  )
    throw Error("Blocked member can still read tasks");
  lead.once("dialog", (dialog) =>
    dialog.accept("Access restored after review"),
  );
  await lead
    .getByRole("button", { name: "Restore access", exact: true })
    .click();
  await lead
    .getByRole("button", { name: "Remove access", exact: true })
    .waitFor();
  await member.reload();
  await member
    .getByRole("heading", { name: "Earlier task", exact: true })
    .waitFor();
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: custom board/column creation, USD prices and totals, due-date card ordering, circular clock, persistent shift after reload, mobile clock, management visibility, forced clock-out, reasoned time adjustment, and board access removal/restoration.",
  );
} finally {
  await browser?.close();
  server.kill();
  await new Promise((resolve) => server.once("exit", resolve));
  await rm(temporary, { recursive: true, force: true });
}
