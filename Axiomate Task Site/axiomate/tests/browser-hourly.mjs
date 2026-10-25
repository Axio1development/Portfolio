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
  await lead.getByLabel("Workspace name").fill("Negotiation studio");
  await lead
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await lead.getByRole("button", { name: "Create board", exact: true }).click();
  await lead.getByLabel("Board name").fill("Production");
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
  await lead
    .locator(".sidebar")
    .getByRole("button", { name: "Team", exact: true })
    .click();
  await lead
    .getByLabel("Email address", { exact: true })
    .fill("artist@example.test");
  await lead.getByRole("button", { name: "Create invitation link" }).click();
  const invite = lead.getByLabel("Invitation link");
  await invite.waitFor();
  await member.goto(await invite.inputValue());
  await signup(member, "Artist", "artist@example.test");
  await member.getByRole("button", { name: "Accept invitation" }).click();
  await member
    .getByRole("heading", { name: "Negotiation studio", exact: true })
    .waitFor();
  await lead.reload();
  await lead.getByRole("button", { name: "Create task", exact: true }).click();
  await lead.getByLabel("Task name").fill("Environment art");
  await lead
    .getByLabel("Assigned individual")
    .selectOption({ label: "Artist (developer)" });
  await lead.getByLabel("Pricing type", { exact: true }).selectOption("hourly");
  await lead.getByLabel("Planned hours", { exact: true }).fill("8");
  await lead.getByLabel("Hourly rate / USD", { exact: true }).fill("25");
  await lead
    .locator(".hourly-estimate")
    .getByText("$200.00", { exact: true })
    .waitFor();
  await lead.getByRole("button", { name: "Save task", exact: true }).click();
  await lead
    .locator(".board-cost")
    .getByText("$200.00", { exact: true })
    .waitFor();
  await member.reload();
  await member
    .getByRole("heading", { name: "Environment art", exact: true })
    .click();
  await member
    .getByRole("button", { name: "Propose different terms", exact: true })
    .click();
  await member.getByLabel("Proposed hours", { exact: true }).fill("10");
  await member
    .getByLabel("Proposed hourly rate / USD", { exact: true })
    .fill("30");
  await member
    .getByLabel("Proposal message")
    .fill("More time is needed for the requested detail.");
  await member
    .getByRole("button", { name: "Send proposal", exact: true })
    .click();
  await member
    .getByText("Proposal awaiting response", { exact: true })
    .waitFor();
  await member
    .locator(".board-cost")
    .getByText("$200.00", { exact: true })
    .waitFor();
  await lead.reload();
  await lead
    .getByRole("heading", { name: "Environment art", exact: true })
    .click();
  await lead
    .getByRole("button", { name: "Send a counteroffer", exact: true })
    .click();
  await lead.getByLabel("Proposed hours", { exact: true }).fill("9");
  await lead
    .getByLabel("Proposed hourly rate / USD", { exact: true })
    .fill("28");
  await lead
    .getByLabel("Proposal message")
    .fill("Can we agree to nine hours at this rate?");
  await lead
    .getByRole("button", { name: "Send proposal", exact: true })
    .click();
  await lead
    .getByText("Waiting for Artist to respond.", { exact: true })
    .waitFor();
  if (
    await lead
      .getByRole("button", { name: "Accept proposal", exact: true })
      .count()
  )
    throw Error("Proposer can accept their own counteroffer");
  await mkdir("artifacts", { recursive: true });
  await lead.screenshot({
    path: "artifacts/hourly-counteroffer.png",
    fullPage: true,
  });
  await member.reload();
  await member
    .getByRole("heading", { name: "Environment art", exact: true })
    .click();
  await member
    .getByRole("button", { name: "Accept proposal", exact: true })
    .click();
  await member
    .locator(".hourly-estimate")
    .getByText("$252.00", { exact: true })
    .waitFor();
  await lead.reload();
  await lead
    .locator(".board-cost")
    .getByText("$252.00", { exact: true })
    .waitFor();
  await lead
    .getByRole("heading", { name: "Environment art", exact: true })
    .click();
  if (
    !(await lead.getByLabel("Hourly rate / USD", { exact: true }).isDisabled())
  )
    throw Error("Accepted terms can be silently edited");
  await lead.screenshot({
    path: "artifacts/hourly-accepted-terms.png",
    fullPage: true,
  });
  await member.setViewportSize({ width: 390, height: 844 });
  await member.screenshot({
    path: "artifacts/hourly-negotiation-mobile.png",
    fullPage: true,
  });
  if (
    await member.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw Error("Negotiation overflows the mobile viewport");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: hourly task setup, estimated budget, collaborator proposal, owner counteroffer, unchanged pending totals, recipient acceptance, automatic board total update, protected agreed terms, and mobile negotiation layout.",
  );
} finally {
  await browser?.close();
  server.kill();
  await new Promise((resolve) => server.once("exit", resolve));
  await rm(temporary, { recursive: true, force: true });
}
