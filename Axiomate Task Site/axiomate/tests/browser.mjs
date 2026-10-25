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
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const r = await fetch("http://127.0.0.1:8081/api.php?action=state");
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mkdir("artifacts", { recursive: true });
  await page.goto("http://127.0.0.1:8081");
  let demoPosts = 0;
  const trackWrites = (request) => {
    if (request.method() === "POST") demoPosts++;
  };
  page.on("request", trackWrites);
  await page.getByRole("button", { name: "View live demo" }).waitFor();
  await page.screenshot({
    path: "artifacts/login-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "View live demo" }).click();
  await page.getByRole("heading", { name: "Website launch" }).waitFor();
  await page.screenshot({ path: "artifacts/demo-desktop.png", fullPage: true });
  if (!page.url().includes("preview=1"))
    throw Error("Demo link is not shareable");
  if (
    !(await page
      .getByRole("button", { name: "Create task", exact: true })
      .isDisabled())
  )
    throw Error("Demo creation is enabled");
  if (await page.locator('[draggable="true"]').count())
    throw Error("Demo cards can be dragged");
  await page.getByLabel("Search sample tasks").fill("account security");
  if ((await page.locator(".sample-card").count()) !== 1)
    throw Error("Demo search did not filter");
  await page.getByLabel("Search sample tasks").fill("");
  await page.getByLabel("Filter sample priority").selectOption("High");
  if ((await page.locator(".sample-card").count()) !== 3)
    throw Error("Demo priority filter failed");
  await page
    .getByLabel("Filter sample priority")
    .selectOption("All priorities");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: /Review account security/ }).click();
  const details = page.getByRole("dialog", { name: "Sample task details" });
  await details.waitFor();
  if (await details.locator("input:not([disabled]),textarea,select").count())
    throw Error("Editable demo fields found");
  if (await details.getByRole("button", { name: /Save|Delete|Edit/ }).count())
    throw Error("Demo mutation button found");
  await page.screenshot({
    path: "artifacts/demo-task-details.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Board", exact: true })
    .first()
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/demo-mobile.png", fullPage: true });
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
  )
    throw Error("Mobile demo overflows viewport");
  await page.reload();
  await page.getByRole("heading", { name: "Website launch" }).waitFor();
  if (demoPosts !== 0) throw Error("Demo issued a write request");
  page.off("request", trackWrites);
  await page
    .getByRole("button", { name: "Back to sign in", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "View live demo" }).waitFor();
  await page.screenshot({ path: "artifacts/login-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const isolated = await browser.newPage();
  await isolated.route("**/api.php**", (route) => route.abort());
  await isolated.goto("http://127.0.0.1:8081/?preview=1");
  await isolated.getByRole("heading", { name: "Website launch" }).waitFor();
  await isolated.close();

  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page.getByLabel("Your name").fill("Browser Test");
  await page.getByLabel("Email address").fill("browser@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("BrowserPassword123!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "A little room to get things done." })
    .waitFor();
  await page.screenshot({
    path: "artifacts/plans-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Choose Starter" }).click();
  await page
    .getByRole("heading", { name: "Your work. Your workspace." })
    .waitFor();
  await page.screenshot({
    path: "artifacts/create-workspace.png",
    fullPage: true,
  });
  await page.getByLabel("Workspace name").fill("Website project");
  await page.getByLabel("Description").fill("A workspace I created.");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Website project", exact: true })
    .first()
    .waitFor();

  await page.getByRole("button", { name: "Create board", exact: true }).click();
  await page.getByLabel("Board name").fill("Delivery board");
  await page
    .getByRole("dialog", { name: "Create board", exact: true })
    .getByRole("button", { name: "Create board", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add first column", exact: true })
    .click();
  await page.getByLabel("Column name").fill("Work");
  await page
    .getByRole("button", { name: "Create column", exact: true })
    .click();
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await page.getByLabel("Task name").fill("Ship the cleaner workspace");
  await page
    .getByLabel("Description")
    .fill("A focused board with simple account setup.");
  await page.getByLabel("Checklist").fill("Review the flow\nShip the update");
  await page.getByRole("button", { name: "Save task" }).click();
  await page
    .getByRole("heading", { name: "Ship the cleaner workspace" })
    .waitFor();
  await page.screenshot({
    path: "artifacts/board-desktop.png",
    fullPage: true,
  });

  await page
    .getByRole("button", { name: "New workspace", exact: true })
    .click();
  await page.getByLabel("Workspace name").fill("Another project");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Another project", exact: true })
    .first()
    .waitFor();
  if (
    await page
      .getByRole("heading", { name: "Ship the cleaner workspace" })
      .count()
  )
    throw Error("Task leaked into another workspace");
  await page
    .getByLabel("Switch workspace")
    .selectOption({ label: "Website project" });
  await page
    .getByRole("heading", { name: "Ship the cleaner workspace" })
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "Ship the cleaner workspace" })
    .waitFor();
  await page
    .getByRole("button", { name: "Workspace settings", exact: true })
    .click();
  await page.getByLabel("Workspace name").fill("Updated website project");
  await page
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Updated website project", exact: true })
    .first()
    .waitFor();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByText("Account ID", { exact: true }).waitFor();
  await page.screenshot({
    path: "artifacts/account-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/account-mobile.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (overflow) throw Error("Mobile account page overflows viewport");
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await page.screenshot({ path: "artifacts/board-mobile.png", fullPage: true });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: read-only demo, zero demo POST requests, non-editable details, no dragging, search/filter/list navigation, shareable API-independent preview, mobile layouts, signup, plan selection, task save, account ID, and no client exceptions.",
  );
} finally {
  await browser?.close();
  server.kill();
  await new Promise((resolve) => server.once("exit", resolve));
  await rm(temporary, { recursive: true, force: true });
}
