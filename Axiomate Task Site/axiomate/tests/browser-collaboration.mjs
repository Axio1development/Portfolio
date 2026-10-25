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
  });
  const memberContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const lead = await leadContext.newPage(),
    member = await memberContext.newPage();
  lead.setDefaultTimeout(10000);
  member.setDefaultTimeout(10000);
  const errors = [];
  lead.on("pageerror", (error) => errors.push(error.message));
  member.on("pageerror", (error) => errors.push(error.message));
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
  await signup(lead, "Project Lead", "lead@example.test");
  await lead.getByRole("button", { name: "Choose Starter" }).click();
  await lead.getByLabel("Workspace name").fill("Game production");
  await lead
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await lead.getByRole("button", { name: "Create board", exact: true }).click();
  await lead.getByLabel("Board name").fill("Delivery board");
  await lead
    .getByRole("dialog", { name: "Create board", exact: true })
    .getByRole("button", { name: "Create board", exact: true })
    .click();
  await lead
    .getByRole("button", { name: "Add first column", exact: true })
    .click();
  await lead.getByLabel("Column name").fill("Work");
  await lead
    .getByRole("button", { name: "Create column", exact: true })
    .click();
  await lead.getByRole("button", { name: "Team", exact: true }).click();
  await lead
    .getByLabel("Email address", { exact: true })
    .fill("actor@example.test");
  await lead.getByLabel("Role").selectOption("voice_actor");
  await lead.getByRole("button", { name: "Create invitation link" }).click();
  await lead.getByLabel("Invitation link").waitFor();
  const invitation = await lead.getByLabel("Invitation link").inputValue();
  await mkdir("artifacts", { recursive: true });
  await lead.screenshot({
    path: "artifacts/team-invitation-desktop.png",
    fullPage: true,
  });
  await member.goto(invitation);
  await signup(member, "Voice Artist", "actor@example.test");
  await member.getByRole("button", { name: "Accept invitation" }).click();
  await member
    .getByRole("heading", { name: "Game production", exact: true })
    .first()
    .waitFor();
  if (
    await member
      .getByRole("button", { name: "Create task", exact: true })
      .count()
  )
    throw Error("Collaborator can create tasks");
  await lead.reload();
  await lead.getByRole("button", { name: "Create task", exact: true }).click();
  await lead.getByLabel("Task name").fill("Opening narration");
  await lead
    .getByLabel("Description")
    .fill("Record the opening line in a calm tone.");
  await lead
    .getByLabel("Assigned individual")
    .selectOption({ label: "Voice Artist (voice actor)" });
  await lead.getByRole("button", { name: "Save task" }).click();
  await member.reload();
  await member.getByRole("heading", { name: "Opening narration" }).click();
  if (!(await member.getByLabel("Task name").isDisabled()))
    throw Error("Collaborator can edit task details");
  await member.getByLabel("Attach your work").setInputFiles({
    name: "opening-take.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("RIFF-demo-audio-file"),
  });
  await member
    .getByLabel("Submission note")
    .fill("First take, ready for feedback.");
  await member
    .getByRole("button", { name: "Submit work", exact: true })
    .click();
  await member
    .getByText("Work submitted. The task is ready for review.")
    .waitFor();
  await member.screenshot({
    path: "artifacts/member-submission-desktop.png",
    fullPage: true,
  });
  await member.setViewportSize({ width: 390, height: 844 });
  await member.screenshot({
    path: "artifacts/member-submission-mobile.png",
    fullPage: true,
  });
  if (
    await member.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw Error("Mobile task submission overflows");
  await lead.reload();
  await lead.getByRole("heading", { name: "Opening narration" }).click();
  await lead
    .getByRole("link", { name: "opening-take.wav", exact: true })
    .waitFor();
  const href = await lead
    .getByRole("link", { name: "opening-take.wav", exact: true })
    .getAttribute("href");
  const response = await leadContext.request.get(
    "http://127.0.0.1:8081" + href,
  );
  if (
    response.status() !== 200 ||
    (await response.body()).toString() !== "RIFF-demo-audio-file"
  )
    throw Error("Lead cannot download the correct file");
  if (
    (await lead.getByLabel("Status", { exact: true }).inputValue()) !==
    "In review"
  )
    throw Error("Submission did not move the task to review");
  await lead.screenshot({
    path: "artifacts/lead-review-desktop.png",
    fullPage: true,
  });
  await lead
    .getByRole("button", { name: "Request changes", exact: true })
    .click();
  await lead
    .getByLabel("Review feedback")
    .fill("Please record the line with a warmer delivery.");
  await lead
    .getByRole("button", { name: "Send change request", exact: true })
    .click();
  await lead.getByText("Changes requested", { exact: true }).waitFor();
  await member.reload();
  await member.getByRole("heading", { name: "Opening narration" }).click();
  await member
    .getByText("Please record the line with a warmer delivery.", {
      exact: true,
    })
    .waitFor();
  await member.getByLabel("Attach your work").setInputFiles({
    name: "revised-take.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("RIFF-revised-audio"),
  });
  await member
    .getByRole("button", { name: "Submit work", exact: true })
    .click();
  await member
    .getByText("Work submitted. The task is ready for review.")
    .waitFor();
  await lead.reload();
  await lead.getByRole("heading", { name: "Opening narration" }).click();
  await lead.getByRole("button", { name: "Approve work", exact: true }).click();
  await lead.getByText("Approved", { exact: true }).waitFor();
  await lead.screenshot({
    path: "artifacts/studio-work-review.png",
    fullPage: true,
  });
  await lead.getByRole("button", { name: "Close", exact: true }).click();
  await lead.getByRole("button", { name: "Team", exact: true }).click();
  await lead
    .getByLabel("Rank for Voice Artist")
    .selectOption("studio_director");
  await member.reload();
  await member.getByRole("button", { name: "Team", exact: true }).click();
  await member.getByText("Studio Director", { exact: true }).waitFor();
  for (const rank of ["studio_director", "studio_manager"]) {
    await lead.getByLabel("Rank for Voice Artist").selectOption(rank);
    await member.reload();
    await member
      .locator(".sidebar")
      .getByRole("button", { name: "Board", exact: true })
      .click();
    await member
      .getByRole("heading", { name: "Opening narration", exact: true })
      .click();
    if (await member.getByLabel("Status", { exact: true }).isDisabled())
      throw Error(rank + " cannot set task status");
    if (!(await member.getByLabel("Task name").isDisabled()))
      throw Error(rank + " can edit task details");
    await member
      .getByLabel("Status", { exact: true })
      .selectOption("In progress");
    await member
      .getByRole("button", { name: "Save task", exact: true })
      .click();
    await member
      .getByRole("dialog", { name: "Task editor" })
      .waitFor({ state: "hidden" });
    await member
      .getByRole("heading", { name: "Opening narration", exact: true })
      .click();
    if (
      (await member.getByLabel("Status", { exact: true }).inputValue()) !==
      "In progress"
    )
      throw Error("Leadership status was not saved");
    await member.getByRole("button", { name: "Close", exact: true }).click();
  }
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: UI invitation creation, invited signup, no-plan join, real member assignment, restricted collaborator editor, file submission, owner download, review status, final approval, and mobile submission layout.",
  );
} finally {
  await browser?.close();
  server.kill();
  await new Promise((resolve) => server.once("exit", resolve));
  await rm(temporary, { recursive: true, force: true });
}
