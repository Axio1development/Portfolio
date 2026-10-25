"use strict";
const state = {
  user: null,
  courses: [],
  progress: {},
  attempts: {},
  grades: {},
  classes: [],
  gradebook: [],
  csrf: "",
  view: "dashboard",
  query: "",
  filter: "All categories",
  level: "All levels",
  choice: null,
  busy: false,
  ownerData: null,
};
const $ = (s) => document.querySelector(s);
const escapeHtml = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  book: "M4 4h7a4 4 0 0 1 1 1 4 4 0 0 1 1-1h7v15h-7a4 4 0 0 0-1 1 4 4 0 0 0-1-1H4zM12 5v15",
  chart: "M4 20V4m0 16h16M8 16v-4m5 4V8m5 8V5",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  clock: "M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  check: "m5 12 4 4L19 6",
  bolt: "m13 2-9 12h7l-1 8 10-12h-7z",
  tool: "m14 6 4 4m-9 4-6 6 2 2 6-6M14 3a6 6 0 0 0-6 8l5 5a6 6 0 0 0 8-6l-5 3-5-5z",
  help: "M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  logout: "M9 4H4v16h5m5-13 5 5-5 5m-5-5h10",
  award: "m8 15-2 7 6-3 6 3-2-7M19 9A7 7 0 1 1 5 9a7 7 0 0 1 14 0",
  layers: "m12 3 10 5-10 5L2 8zm-10 9 10 5 10-5M2 16l10 5 10-5",
};
function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.book}"/></svg>`;
}
async function api(action, data) {
  const res = await fetch(`/api.php?action=${action}`, {
    method: data ? "POST" : "GET",
    headers: data
      ? { "Content-Type": "application/json", "X-CSRF-Token": state.csrf }
      : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  let result;
  try {
    result = await res.json();
  } catch {
    throw new Error("The service could not be reached. Please try again.");
  }
  if (!res.ok) throw new Error(result.error || "Please try again.");
  return result;
}
const isTeacher = () => ["teacher", "owner"].includes(state.user?.role);
const courseById = (id) => state.courses.find((c) => c.id === id);
const lessonCount = () => state.courses.reduce((n, c) => n + c.lesson_count, 0);
const done = (id) => Object.keys(state.attempts[id] || {}).length;
const nextActivity = (id) =>
  courseById(id)?.lessons.findIndex((_, i) => !state.attempts[id]?.[i]) >= 0
    ? courseById(id).lessons.findIndex((_, i) => !state.attempts[id]?.[i])
    : 0;
const total = () => state.courses.reduce((n, c) => n + done(c.id), 0);
const roleName = () =>
  ({ student: "Student", teacher: "Teacher", owner: "Owner" })[
    state.user?.role
  ] || "Visitor";
const pct = (c) => Math.round((done(c.id) / c.lesson_count) * 100);
const courseName = (id) => courseById(id)?.title || id;
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
function lessonGroups(c) {
  const g = [];
  c.lessons.forEach((l, i) => {
    const k = l.lesson ?? i;
    let x = g.find((y) => y.k === k);
    if (!x) g.push((x = { k, title: l.title, items: [] }));
    x.items.push(i);
  });
  return g;
}
const assignedToMe = (id) =>
  state.user?.role === "student" &&
  state.classes.some((k) => k.assignments?.some((x) => x.course_id === id));
function tracks() {
  const map = new Map();
  for (const c of state.courses) {
    const key = c.topic ? "t:" + c.topic : "c:" + c.id;
    if (!map.has(key)) map.set(key, { title: c.topic || c.title, levels: [] });
    map.get(key).levels.push(c);
  }
  return [...map.values()].map((t) => {
    t.levels.sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
    t.stage = t.levels.findIndex((c) => !state.grades[c.id]);
    t.complete = t.stage < 0;
    t.current = t.levels[t.complete ? t.levels.length - 1 : t.stage];
    t.status = t.complete ? "Completed" : t.current.level;
    return t;
  });
}
const trackOf = (c) =>
  tracks().find((t) => t.levels.some((l) => l.id === c.id));
function lockedBy(c) {
  if (!c.topic || isTeacher() || assignedToMe(c.id)) return null;
  const t = trackOf(c);
  return (
    t.levels
      .slice(
        0,
        t.levels.findIndex((l) => l.id === c.id),
      )
      .find((l) => !state.grades[l.id]) || null
  );
}
function nextLevel(c) {
  if (!c.topic) return null;
  const t = trackOf(c);
  return t.levels[t.levels.findIndex((l) => l.id === c.id) + 1] || null;
}
function trackHref(t) {
  return t.complete
    ? `#course/${t.levels[0].id}/0`
    : `#course/${t.current.id}/${nextActivity(t.current.id)}`;
}
function trackCard(t) {
  const c = t.current,
    n = done(c.id),
    multi = t.levels.length > 1,
    href = trackHref(t);
  const avg = t.complete
    ? Math.round(
        t.levels.reduce((sum, l) => sum + state.grades[l.id].percentage, 0) /
          t.levels.length,
      )
    : 0;
  const steps = multi
    ? `<ol class="level-steps" aria-label="Level progress">${t.levels.map((l, i) => `<li class="${state.grades[l.id] ? "done" : i === t.stage ? "current" : ""}">${state.grades[l.id] ? icon("check") : `<i>${i + 1}</i>`}<span>${l.level}</span></li>`).join("")}</ol>`
    : "";
  const finalText = t.complete
    ? multi
      ? `Completed · average ${avg}%`
      : `Completed · ${state.grades[c.id].percentage}% · ${state.grades[c.id].letter}`
    : n
      ? multi
        ? `Continue ${c.level.toLowerCase()}`
        : "Continue learning"
      : multi
        ? `Start ${c.level.toLowerCase()}`
        : "Start course";
  return `<article class="course-card ${t.complete ? "is-complete" : ""}"><a href="${href}" class="course-art ${c.color}" aria-label="Open ${escapeHtml(t.title)}">${visual(c)}<span class="art-badge">${icon(t.complete ? "check" : "layers")} ${t.complete ? "COMPLETED" : c.lesson_count + " QUESTIONS"}</span></a><div class="course-body"><div class="course-meta"><span class="category ${c.color}">${escapeHtml(c.category)}</span><span class="level-label ${t.complete ? "level-complete" : "level-" + c.level.toLowerCase()}">${t.status}</span></div><h3><a href="${href}">${escapeHtml(t.title)}</a></h3><p>${escapeHtml(t.complete ? (multi ? "All three levels finished. Review any level at any time." : "Course finished. Review it at any time.") : c.description)}</p>${steps}<div class="course-details"><span>${icon("clock")}${c.minutes} min</span><span>${icon("book")}${c.lesson_groups ? c.lesson_groups + " lessons · " : ""}${c.lesson_count} questions</span></div>${c.teacher_id ? `<p class="course-author">By ${escapeHtml(c.author)}</p>` : ""}<div class="card-progress"><progress max="${c.lesson_count}" value="${t.complete ? c.lesson_count : n}" aria-label="${escapeHtml(t.title)} progress"></progress><span>${t.complete ? 100 : pct(c)}%</span></div><a class="course-link" href="${href}">${finalText}${icon(t.complete ? "check" : "arrow")}</a></div></article>`;
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
function heading(
  title,
  copy,
  eyebrow = "YOUR LEARNING WORKSPACE",
  action = "",
) {
  return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></div>${action}</div>`;
}
function empty(title, copy) {
  return `<div class="empty-state"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></div>`;
}
function concept(c) {
  const nodes = c.nodes || ["Explore", "Understand", "Assess"];
  return `<svg class="technical concept-map" viewBox="0 0 640 350" role="img" aria-label="${escapeHtml(c.topic || c.title)} concept map"><rect width="640" height="350" fill="#eef3f6"/><path d="M180 125h280M180 125v90m140-90v90m140-90v90M320 79v46" stroke="#9fb4c2" stroke-width="3" fill="none"/><rect x="210" y="35" width="220" height="52" rx="9" fill="#243e53"/><text x="320" y="67" text-anchor="middle" class="concept-title">SYSTEM OVERVIEW</text>${nodes.map((node, i) => `<g><rect x="${105 + i * 140}" y="214" width="150" height="70" rx="9" fill="${i === 1 ? "#fae4d3" : "#dce7ef"}" stroke="${i === 1 ? "#db9b6f" : "#a3bacb"}"/><circle cx="${180 + i * 140}" cy="181" r="18" fill="#fff" stroke="#a3bacb"/><text x="${180 + i * 140}" y="185" text-anchor="middle">0${i + 1}</text><text x="${180 + i * 140}" y="254" text-anchor="middle" class="node-label">${escapeHtml(node)}</text></g>`).join("")}<text x="320" y="325" text-anchor="middle">CONCEPT MAP · SIMPLIFIED RELATIONSHIPS</text></svg>`;
}
function visual(c, interactive = false, key = c.visual) {
  return key === "concept"
    ? concept(c)
    : diagram(key || "engine", interactive, c.explore);
}
function explorer(c) {
  if (!c.explore || typeof TOPIC_ART === "undefined" || !TOPIC_ART[c.visual])
    return "";
  const sel = state.explorePart?.course === c.id ? state.explorePart.id : null,
    p = sel && c.explore[sel];
  return `<section class="explorer" aria-label="System explorer"><div class="explorer-art">${diagram(c.visual, true, c.explore)}</div><div class="explorer-info"><span class="eyebrow">${icon("search")} SYSTEM EXPLORER</span><div aria-live="polite"><h3>${p ? escapeHtml(p.label) : "Tap any component"}</h3><p>${p ? escapeHtml(p.info) : "Select a part of the illustration, or a name below, to see what it does and why it matters when you’re diagnosing."}</p></div><div class="explore-chips">${Object.entries(
    c.explore,
  )
    .map(
      ([id, v]) =>
        `<button type="button" class="chip ${sel === id ? "active" : ""}" data-explore="${id}" aria-pressed="${sel === id}">${escapeHtml(v.label)}</button>`,
    )
    .join("")}</div></div></section>`;
}
function shell(content) {
  const name = state.user?.name || "Future technician";
  const nav = [
    ["dashboard", "grid", "Dashboard"],
    ["courses", "book", "Course library"],
    ["progress", "chart", "My grades"],
    ["classroom", "layers", isTeacher() ? "My classes" : "My classroom"],
  ];
  if (isTeacher())
    nav.push(
      ["teaching", "award", "Teacher gradebook"],
      ["author", "tool", "Create a course"],
    );
  if (state.user?.role === "owner")
    nav.push(["owner", "grid", "Owner overview"]);
  nav.push(["account", "help", "Account"]);
  return `<aside class="sidebar"><a class="brand" href="#dashboard"><img src="/assets/mark.svg" alt=""><div>axiomate<span>AUTOMOTIVE ACADEMY</span></div></a><div class="workspace-label">${roleName().toUpperCase()} WORKSPACE</div><nav aria-label="Main navigation">${nav.map(([id, i, label]) => `<a class="nav-link ${state.view === id ? "active" : ""}" href="#${id}" ${state.view === id ? 'aria-current="page"' : ""}>${icon(i)}${label}${id === "courses" ? `<span class="nav-count">${tracks().length}</span>` : ""}</a>`).join("")}</nav><div class="side-tip"><span class="tiny-icon">${icon("bolt")}</span><h3>A skill for every<br>stage of your journey.</h3><p>Beginner. Intermediate. Advanced.<br>Keep moving forward.</p><a href="#courses">Explore your next level ${icon("arrow")}</a></div><div class="sidebar-bottom"><div class="profile"><a href="#account" class="avatar" aria-label="Your account">${escapeHtml(name[0].toUpperCase())}</a><div><strong>${escapeHtml(name)}</strong><small>${state.user ? roleName() + " · " + state.user.account_id : "Explore the academy"}</small></div><button class="icon-button" id="account-button" aria-label="${state.user ? "Sign out" : "Sign in"}">${icon(state.user ? "logout" : "arrow")}</button></div></div></aside><div class="main-shell"><header class="topbar"><button class="mobile-menu icon-button" aria-label="Toggle navigation">☰</button><div class="breadcrumb">Workspace <span>/</span><strong>${escapeHtml(state.view === "course" ? "Lesson" : nav.find((n) => n[0] === state.view)?.[2] || "Dashboard")}</strong></div><div class="topbar-right"><span class="system-status"><i></i> ${state.user ? roleName() + " workspace" : "Your virtual workshop"}</span>${state.user ? `<a href="#account" class="header-avatar" aria-label="Your account">${escapeHtml(name[0].toUpperCase())}</a>` : '<button class="small-button" data-auth="login">Sign in ' + icon("arrow") + "</button>"}</div></header><main id="main-content">${content}</main><footer><span>© ${new Date().getFullYear()} Axiomate Automotive Academy</span><a href="#resources">Learning guidance & grading policy</a></footer></div>`;
}
function courseCard(c) {
  const n = done(c.id),
    grade = state.grades[c.id];
  return `<article class="course-card"><a href="#course/${c.id}/0" class="course-art ${c.color}" aria-label="Explore ${escapeHtml(c.title)}">${visual(c)}<span class="art-badge">${icon("layers")} ${c.lesson_count} LESSONS</span></a><div class="course-body"><div class="course-meta"><span class="category ${c.color}">${escapeHtml(c.category)}</span><span class="level-label level-${c.level.toLowerCase()}">${c.level}</span></div><h3><a href="#course/${c.id}/0">${escapeHtml(c.title)}</a></h3><p>${escapeHtml(c.description)}</p><div class="course-details"><span>${icon("clock")}${c.minutes} min</span><span>${icon("book")}${c.lesson_count} lessons</span></div>${c.teacher_id ? `<p class="course-author">By ${escapeHtml(c.author)}</p>` : ""}<div class="card-progress"><progress max="${c.lesson_count}" value="${n}" aria-label="${escapeHtml(c.title)} progress"></progress><span>${pct(c)}%</span></div><a class="course-link" href="#course/${c.id}/${nextActivity(c.id)}">${grade ? `Grade: ${grade.percentage}% · ${grade.letter}` : n ? "Continue learning" : "Start course"}${icon(grade ? "check" : "arrow")}</a></div></article>`;
}
function dashboard() {
  const all = tracks(),
    firstTrack =
      all.find((t) => !t.complete && done(t.current.id) > 0) ||
      all.find((t) => !t.complete) ||
      all[0],
    first = firstTrack.current;
  const graded = Object.keys(state.grades).length;
  const selected = all
    .filter((t) => t.status === state.level || state.level === "All levels")
    .slice(0, 4);
  return (
    heading(
      state.user
        ? `Welcome back, ${state.user.name.split(" ")[0]}.`
        : "Welcome to your workshop.",
      "Build the knowledge behind every great technician.",
      "YOUR LEARNING JOURNEY",
      isTeacher()
        ? '<a class="small-button" href="#teaching">Open gradebook ' +
            icon("arrow") +
            "</a>"
        : "",
    ) +
    `<section class="hero"><div class="hero-copy"><span class="hero-tag"><i></i> LEARN BY DOING</span><h2>Your next level<br>starts under the hood.</h2><p>${all.length} courses. Three skill levels each.<br>Explore the systems. Build your understanding.</p><a class="primary" href="#course/${first.id}/${nextActivity(first.id)}">${total() ? "Continue learning" : "Start your first course"}${icon("arrow")}</a></div><div class="hero-visual"><div class="visual-label">VEHICLE SYSTEMS EXPLORER <span>AXIOMATE / ACADEMY</span></div><img src="/assets/car.svg" alt="Illustrated vehicle with highlighted powertrain and chassis systems"><div class="visual-bottom"><span><i></i> BEGINNER → INTERMEDIATE → ADVANCED</span><span>AX / 002</span></div></div></section><section class="stats">${[
      [
        icon("book"),
        all.length,
        "Available courses",
        `${lessonCount()} questions across all levels`,
      ],
      [
        icon("award"),
        graded,
        "Levels completed",
        `${all.filter((t) => t.complete).length} course${all.filter((t) => t.complete).length === 1 ? "" : "s"} fully completed`,
      ],
      [
        icon("chart"),
        `${Math.round((total() / lessonCount()) * 100)}%`,
        "Overall progress",
        `${total()} of ${lessonCount()} questions answered`,
      ],
    ]
      .map(
        ([i, n, label, copy]) =>
          `<div class="stat"><span class="stat-icon">${i}</span><div><span class="stat-value">${n}</span><strong>${label}</strong><small>${copy}</small></div></div>`,
      )
      .join(
        "",
      )}</section>${state.user?.role === "student" && state.classes.length ? `<div class="assignment-banner"><div><strong>Your classroom is ready</strong><p>${state.classes.length} joined class${state.classes.length === 1 ? "" : "es"} · Your teacher receives grades for assigned courses.</p></div><a href="#classroom" class="small-button">View assignments ${icon("arrow")}</a></div>` : ""}<div class="section-heading"><div><h2>Find your next level</h2><p>Every course starts at Beginner. Finish a level to unlock the next.</p></div><a class="subtle-link" href="#courses">All ${all.length} courses ${icon("arrow")}</a></div><div class="filters level-tabs">${["All levels", "Beginner", "Intermediate", "Advanced", "Completed"].map((f) => `<button class="filter ${state.level === f ? "selected" : ""}" data-level="${f}" aria-pressed="${state.level === f}">${f}</button>`).join("")}</div><div class="course-grid">${selected.length ? selected.map(trackCard).join("") : empty(state.level === "Completed" ? "Nothing completed yet" : "No courses at this level", "Finish a level to move a course forward.")}</div><section class="bottom-banner"><span class="banner-icon">${icon("award")}</span><div><h3>Every course ends with a grade.</h3><p>Finish every lesson to receive your percentage and letter grade. Assigned grades appear in your teacher’s gradebook.</p></div><a href="#resources">How grading works ${icon("arrow")}</a></section>`
  );
}
function library() {
  const categories = [...new Set(state.courses.map((c) => c.category))].sort();
  return (
    heading(
      "Course library",
      `${tracks().length} courses · ${lessonCount()} graded questions · Beginner → Intermediate → Advanced`,
      "EXPLORE. UNDERSTAND. PROGRESS.",
    ) +
    `<div class="catalog-tools"><label class="search">${icon("search")}<input id="course-search" type="search" placeholder="Search engine repair, HVAC, ADAS…" value="${escapeHtml(state.query)}" aria-label="Search courses"></label><label>Category<select id="category-filter"><option>All categories</option>${categories.map((c) => `<option ${state.filter === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}</select></label><label>Your level<select id="level-filter">${["All levels", "Beginner", "Intermediate", "Advanced", "Completed"].map((l) => `<option ${state.level === l ? "selected" : ""}>${l}</option>`).join("")}</select></label></div><div id="course-results" class="course-grid">${filteredCards()}</div>`
  );
}
function filteredCards() {
  const found = tracks().filter(
    (t) =>
      (state.filter === "All categories" ||
        t.current.category === state.filter) &&
      (state.level === "All levels" || state.level === t.status) &&
      `${t.title} ${t.current.category} ${t.levels.map((l) => l.description).join(" ")}`
        .toLowerCase()
        .includes(state.query.toLowerCase()),
  );
  return found.length
    ? found.map(trackCard).join("")
    : empty("No matching courses", "Try another level, category or search.");
}
function progressPage() {
  const started = state.courses.filter(
    (c) => done(c.id) || state.progress[c.id]?.length,
  );
  return (
    heading(
      "My grades",
      "Your first submitted answer for each lesson determines your final course grade.",
      "EVERY LESSON COUNTS",
    ) +
    `<div class="progress-summary"><div><span class="eyebrow">LESSONS SUBMITTED</span><h2>${total()} <small>/ ${lessonCount()}</small></h2><progress max="${lessonCount()}" value="${total()}" aria-label="Lessons submitted"></progress></div><div><span class="eyebrow">COURSES GRADED</span><h2>${Object.keys(state.grades).length}</h2><p>A 90–100 · B 80–89 · C 70–79 · D 60–69 · F below 60</p></div></div>${
      !state.user
        ? '<button class="primary" data-auth="login">Sign in to view your grades ' +
          icon("arrow") +
          "</button>"
        : started.length
          ? `<div class="progress-list">${started
              .map((c) => {
                const g = state.grades[c.id];
                return `<article><div class="mini-art ${c.color}">${icon(g ? "award" : "book")}</div><div><h3>${escapeHtml(c.title)}</h3><p>${done(c.id)} / ${c.lesson_count} lessons submitted${state.progress[c.id]?.length && !done(c.id) ? " · Previous progress preserved; submit answers to earn a grade." : ""}</p></div>${g ? `<span class="grade-badge">${g.percentage}% · ${g.letter}</span>` : `<progress max="${c.lesson_count}" value="${done(c.id)}" aria-label="Course progress"></progress>`}<a class="small-button" href="#course/${c.id}/${nextActivity(c.id)}">${g ? "Review" : "Continue"} ${icon("arrow")}</a></article>`;
              })
              .join("")}</div>`
          : empty(
              "Your first grade is ahead",
              "Choose a course from the library and submit every lesson to earn a grade.",
            )
    }`
  );
}
function lesson() {
  const p = location.hash.split("/"),
    c = courseById(p[1]),
    a = Number(p[2] || 0);
  if (!c || !Number.isInteger(a) || a < 0 || a >= c.lesson_count)
    return empty(
      "Lesson not found",
      "Return to the course library to choose a lesson.",
    );
  const lock = lockedBy(c);
  if (lock)
    return (
      `<a class="back-link" href="#courses">← Back to courses</a>` +
      empty(
        `${c.level} is locked`,
        `Finish ${c.topic} · ${lock.level} first. Each level unlocks after the one before it is complete.`,
      ) +
      `<p class="locked-action"><a class="primary" href="#course/${lock.id}/${nextActivity(lock.id)}">Go to ${lock.level} ${icon("arrow")}</a></p>`
    );
  const l = c.lessons[a],
    record = state.attempts[c.id]?.[a],
    choice = record ? record.choice : state.choice,
    grade = state.grades[c.id],
    up = nextLevel(c);
  return `<a class="back-link" href="#courses">← Back to courses</a><div class="lesson-header"><div><span class="eyebrow">${escapeHtml(c.category.toUpperCase())} / ${c.level.toUpperCase()}</span><h1>${escapeHtml(c.title)}</h1></div><span class="lesson-counter">${done(c.id)} / ${c.lesson_count} questions</span></div><div class="lesson-layout"><aside class="lesson-outline"><h3>Inside this course</h3>${lessonGroups(
    c,
  )
    .map((g, n) => {
      const att = state.attempts[c.id] || {},
        doneN = g.items.filter((i) => att[i]).length,
        full = doneN === g.items.length,
        cur = g.items.includes(a),
        first = g.items.find((i) => !att[i]) ?? g.items[0];
      return `<a href="#course/${c.id}/${first}" class="${cur ? "current" : ""}" ${cur ? 'aria-current="step"' : ""}><span class="step-number ${full ? "finished" : ""}">${full ? icon("check") : String(n + 1).padStart(2, "0")}</span><span>${escapeHtml(g.title)}${g.items.length > 1 ? `<small class="outline-count">${doneN} / ${g.items.length} questions</small>` : ""}</span></a>${cur && g.items.length > 1 ? `<div class="q-dots">${g.items.map((i, j) => `<a href="#course/${c.id}/${i}" class="q-dot ${att[i] ? (att[i].correct ? "ok" : "bad") : ""} ${i === a ? "here" : ""}" aria-label="Question ${j + 1}" ${i === a ? 'aria-current="true"' : ""}>${j + 1}</a>`).join("")}</div>` : ""}`;
    })
    .join(
      "",
    )}<div class="outline-foot">${icon("clock")} About ${c.minutes} minutes<br><small>First submission counts toward your grade.</small></div></aside><div class="lesson-work">${c.scenario && l.type !== "identify" ? `<section class="scenario-card"><span class="scenario-icon">${icon("tool")}</span><div><span class="eyebrow">WORKSHOP SCENARIO · ${c.level.toUpperCase()}</span><p>${escapeHtml(c.scenario)}</p></div></section>` : ""}<section class="intro-panel"><span class="eyebrow">LESSON ${(l.lesson ?? a) + 1}: ${escapeHtml(l.title.toUpperCase())}</span><p class="reading-text">${escapeHtml(l.reading)}</p></section>${l.type !== "identify" ? explorer(c) : ""}<section class="activity-panel"><div class="activity-heading"><span class="activity-tag">${l.qcount > 1 ? `LESSON ${l.lesson + 1} · QUESTION ${l.q} OF ${l.qcount}` : `QUESTION ${a + 1} / ${c.lesson_count}`}</span><span>${l.type === "identify" ? "COMPONENT EXPLORER" : "KNOWLEDGE CHECK"}</span></div><h2>${escapeHtml(l.prompt)}</h2>${l.diagram ? `<div class="diagram-wrap">${visual(c, l.type === "identify", l.diagram)}<span class="diagram-caption">Original teaching illustration · simplified view</span></div>` : ""}${
    l.type === "identify"
      ? `<p class="activity-hint">Select a component in the picture or choose its name below.</p><div class="part-options">${Object.entries(
          l.parts,
        )
          .map(
            ([id, label]) =>
              `<button class="part-choice ${choice === id ? "chosen" : ""}" data-choice="${id}" data-choice-type="part" aria-pressed="${choice === id}" ${record ? "disabled" : ""}>${escapeHtml(label)}</button>`,
          )
          .join("")}</div>`
      : `<div class="quiz-options">${l.options.map((option, i) => `<button class="quiz-choice ${choice === i ? "chosen" : ""}" data-choice="${i}" data-choice-type="quiz" aria-pressed="${choice === i}" ${record ? "disabled" : ""}><span>${String.fromCharCode(65 + i)}</span>${escapeHtml(option)}<span class="option-radio"></span></button>`).join("")}</div>`
  }${record ? `<div class="answer-feedback ${record.correct ? "correct" : "incorrect"}" role="status"><strong>${record.correct ? "Correct · 1 point recorded" : "Incorrect · 0 points recorded"}</strong><p>${escapeHtml(record.explanation)}</p><small>Your first submission is final. You can revisit this explanation at any time.</small></div>` : ``}<div class="activity-actions"><span>${record ? "Answer saved" : choice !== null ? "Ready to submit" : "Choose an answer"}</span>${record ? `<a class="primary" href="${a + 1 < c.lesson_count ? `#course/${c.id}/${a + 1}` : grade && up ? `#course/${up.id}/${nextActivity(up.id)}` : "#progress"}">${a + 1 < c.lesson_count ? (c.lessons[a + 1].lesson !== undefined && c.lessons[a + 1].lesson === l.lesson ? "Next question" : "Next lesson") : grade && up ? `Start ${up.level}` : "View my grade"} ${icon("arrow")}</a>` : `<button class="primary" id="check-answer" ${choice === null || state.busy ? "disabled" : ""}>${state.busy ? "Saving…" : "Submit answer"} ${icon("arrow")}</button>`}</div>${grade ? `<div class="course-complete">${icon("award")}${c.topic ? c.level + " grade" : "Course grade"}: <strong>${grade.percentage}% · ${grade.letter}</strong> · ${grade.correct}/${grade.total} correct${state.user?.role === "student" && state.classes.some((k) => k.assignments.some((x) => x.course_id === c.id)) ? "<p>Saved to your teacher’s gradebook. Email notification has been queued or submitted to the mail server.</p>" : ""}${c.topic ? `<p class="level-unlocked">${up ? `${up.level} level unlocked. <a href="#course/${up.id}/${nextActivity(up.id)}">Start ${up.level} →</a>` : `${escapeHtml(c.topic)} is completed. All three levels are finished.`}</p>` : ""}</div>` : ""}</section></div></div>`;
}
function classroom() {
  if (!state.user)
    return (
      heading(
        "Your classroom",
        "Sign in to join a class or manage your teaching workspace.",
      ) +
      '<button class="primary" data-auth="register">Create an account</button>'
    );
  if (isTeacher()) return teacherClasses();
  return (
    heading(
      "My classroom",
      "Join with a code from your teacher. Assigned course grades are shared with that teacher.",
      "LEARN TOGETHER",
    ) +
    `<section class="workspace-panel"><form id="join-class" class="inline-form"><label>Class join code<input name="code" required minlength="8" maxlength="8" placeholder="8-character code" autocapitalize="characters"></label><button class="primary">Join class ${icon("arrow")}</button></form></section><div class="class-grid">${
      state.classes.length
        ? state.classes
            .map(
              (c) =>
                `<section class="workspace-panel"><span class="eyebrow">${escapeHtml(c.school)}</span><h2>${escapeHtml(c.name)}</h2><p>Teacher: ${escapeHtml(c.teacher_name)}</p><div class="assignment-list">${
                  c.assignments.length
                    ? c.assignments
                        .map((a) => {
                          const course = courseById(a.course_id),
                            g = state.grades[a.course_id];
                          return `<a href="#course/${a.course_id}/${nextActivity(a.course_id)}"><span><strong>${escapeHtml(course?.title || a.course_id)}</strong><small>${course?.lesson_count || 0} lessons · ${course?.level || ""}</small></span><span class="${g ? "grade-badge" : "assignment-status"}">${g ? g.percentage + "% · " + g.letter : "Open →"}</span></a>`;
                        })
                        .join("")
                    : "<p>Your teacher hasn’t assigned any courses yet.</p>"
                }</div></section>`,
            )
            .join("")
        : empty(
            "You haven’t joined a class yet",
            "Ask your teacher for their class code. You can explore the public course library meanwhile.",
          )
    }</div>`
  );
}
function teacherClasses() {
  return (
    heading(
      "My classes",
      "Create a class, share its code, and assign courses from the library or your own collection.",
      "TEACHER WORKSPACE",
      '<a class="small-button" href="#author">Create a course ' +
        icon("arrow") +
        "</a>",
    ) +
    `<section class="workspace-panel"><form id="create-class" class="inline-form"><label>New class name<input name="name" required minlength="3" maxlength="120" placeholder="e.g. Automotive Technology · Period 2"></label><button class="primary">Create class ${icon("arrow")}</button></form></section><div class="class-grid">${
      state.classes.length
        ? state.classes
            .map(
              (c) =>
                `<section class="workspace-panel"><div class="section-heading"><div><span class="eyebrow">${c.student_count} STUDENTS</span><h2>${escapeHtml(c.name)}</h2></div><button class="class-code" data-copy="${c.code}" title="Copy class join code">${c.code}</button></div><p class="muted">Share this join code with your students.</p><form class="assign-form" data-class="${c.id}"><label>Assign a course<select name="course" required><option value="">Choose a course…</option>${state.courses
                  .filter(
                    (x) =>
                      !c.assignments.some((a) => a.course_id === x.id) &&
                      (!x.teacher_id || x.teacher_id === state.user.id),
                  )
                  .map(
                    (x) =>
                      `<option value="${x.id}">${escapeHtml(x.title)} · ${x.lesson_count} lessons</option>`,
                  )
                  .join(
                    "",
                  )}</select></label><button class="small-button">Assign course</button></form><div class="assignment-list">${c.assignments.map((a) => `<a href="#course/${a.course_id}/0"><span><strong>${escapeHtml(courseName(a.course_id))}</strong><small>Assigned · ${courseById(a.course_id)?.lesson_count || 0} lessons</small></span>${icon("check")}</a>`).join("")}</div><details class="roster"><summary>Student roster (${c.students.length})</summary>${c.students.length ? c.students.map((s) => `<p><strong>${escapeHtml(s.name)}</strong><br>${escapeHtml(s.email)}</p>`).join("") : "<p>No students have joined yet.</p>"}</details></section>`,
            )
            .join("")
        : empty(
            "Your first class starts here",
            "Create a class above, then share the join code with your students.",
          )
    }</div>`
  );
}
function emailLabel(status) {
  return (
    {
      accepted: "Accepted by mail server",
      failed: "Send failed",
      queued: "Queued",
      sending: "Sending",
      disabled: "Email off",
      not_queued: "—",
    }[status] || status
  );
}
function gradebook() {
  if (!isTeacher())
    return empty(
      "Teacher access required",
      "Sign in with a teacher account to view your own classes and their grades.",
    );
  return (
    heading(
      "Teacher gradebook",
      "Grades appear automatically when students finish courses assigned in your classes.",
      "CLASSROOM INSIGHTS",
      '<button class="small-button" id="refresh-grades">Refresh / retry email ' +
        icon("arrow") +
        "</button>",
    ) +
    `<div class="assignment-banner"><div><strong>${state.gradebook.filter((g) => g.percentage !== null).length} completed course submissions</strong><p>First-submission scoring · A ≥90 · B ≥80 · C ≥70 · D ≥60 · F &lt;60</p></div><a class="subtle-link" href="#account">Email notifications ${state.user.email_notifications ? "on" : "off"} →</a></div>${state.gradebook.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Class / course</th><th>Lessons</th><th>Grade</th><th>Email</th></tr></thead><tbody>${state.gradebook.map((g) => `<tr><td><strong>${escapeHtml(g.student_name)}</strong><small>${escapeHtml(g.student_email)}</small></td><td><strong>${escapeHtml(courseName(g.course_id))}</strong><small>${escapeHtml(g.class_name)}</small></td><td>${g.submitted_lessons} / ${courseById(g.course_id)?.lesson_count || g.total || "—"}</td><td>${g.percentage === null ? '<span class="muted">In progress</span>' : `<span class="grade-badge">${g.percentage}% · ${g.letter}</span><small>${g.correct}/${g.total} correct</small>`}</td><td><span class="email-status email-${g.email_status}">${emailLabel(g.email_status)}</span></td></tr>`).join("")}</tbody></table></div>` : empty("No student submissions yet", "Create a class, assign a course, and invite students with the join code.")}`
  );
}
let editorSequence = 0;
function lessonEditor() {
  const n = ++editorSequence;
  return `<fieldset class="lesson-editor"><legend>Lesson ${n}</legend><button type="button" class="remove-lesson text-button">Remove lesson</button><label>Lesson title<input data-field="title" required minlength="3" maxlength="120"></label><label>Teaching content<textarea data-field="reading" required minlength="20" maxlength="6000" rows="4" placeholder="Explain the concept before asking a question."></textarea></label><label>Teaching illustration<select data-field="diagram"><option value="">No illustration</option><option value="engine">Engine section</option><option value="electrical">Lighting circuit</option><option value="brakes">Disc brake</option><option value="cooling">Cooling circuit</option></select></label><label>Assessment question<input data-field="prompt" required minlength="5" maxlength="500"></label><div class="editor-options">${["A", "B", "C"].map((v, i) => `<label>Answer ${v}<input data-option="${i}" required maxlength="300"></label>`).join("")}</div><label>Correct answer<select data-field="answer"><option value="0">A</option><option value="1">B</option><option value="2">C</option></select></label><label>Explanation after submission<textarea data-field="explanation" required minlength="10" maxlength="1500" rows="2"></textarea></label></fieldset>`;
}
function authorPage() {
  if (!isTeacher())
    return empty(
      "Teacher access required",
      "Create or sign in to a teacher account to author courses.",
    );
  editorSequence = 0;
  return (
    heading(
      "Create a course",
      "Write lessons, add a question to each one, and assign your published course to a class.",
      "YOUR EXPERTISE. THEIR NEXT LEVEL.",
    ) +
    `<form id="course-editor" class="workspace-panel"><div class="editor-grid"><label>Course title<input name="title" required minlength="3" maxlength="120" placeholder="e.g. Engine diagnosis workshop"></label><label>Level<select name="level"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Category<input name="category" required minlength="2" maxlength="60" placeholder="e.g. Powertrain"></label></div><label>Course description<textarea name="description" required minlength="10" maxlength="500" rows="2"></textarea></label><div id="lesson-editors">${lessonEditor()}</div><div class="editor-actions"><button type="button" class="small-button" id="add-lesson">+ Add lesson</button><span id="editor-count">1 lesson</span></div><p id="editor-error" role="alert"></p><button class="primary" id="publish-course">Publish course ${icon("arrow")}</button></form><div class="section-heading authored-heading"><h2>Your published courses</h2></div><div class="course-grid">${
      state.courses
        .filter((c) => c.teacher_id === state.user.id)
        .map(courseCard)
        .join("") ||
      empty(
        "No courses published yet",
        "Your published courses will appear here.",
      )
    }</div>`
  );
}
function account() {
  if (!state.user)
    return (
      heading("Your account", "Create a student or teacher account to begin.") +
      '<button class="primary" data-auth="register">Create account</button>'
    );
  const u = state.user;
  return (
    heading(
      "Your account",
      "Your identity, teaching information and notification preferences.",
      "ACCOUNT SETTINGS",
    ) +
    `<section class="workspace-panel account-panel"><div class="account-id"><span>ACCOUNT ID</span><strong>${u.account_id}</strong><button class="small-button" data-copy="${u.account_id}">Copy ID</button></div><dl class="account-details"><dt>Name</dt><dd>${escapeHtml(u.name)}</dd><dt>Email</dt><dd>${escapeHtml(u.email)}</dd><dt>Account type</dt><dd>${roleName()}</dd>${isTeacher() ? `<dt>School</dt><dd>${escapeHtml(u.school || "Not provided")}</dd><dt>City / region</dt><dd>${escapeHtml(u.location || "Not provided")}</dd><dt>Department</dt><dd>${escapeHtml(u.department || "Not provided")}</dd><dt>Teaching role</dt><dd>${escapeHtml(u.job_title || "Not provided")}</dd><dt>School details</dt><dd>Self-reported; not independently verified.</dd>` : ""}</dl>${isTeacher() ? `<form id="notification-settings"><label class="checkbox-label"><input type="checkbox" name="email_notifications" ${u.email_notifications ? "checked" : ""}>Email me when a student completes an assigned course</label><p>Sent to ${escapeHtml(u.email)} from noreply@axiomateauto.com.</p><button class="small-button">Save notification preferences</button></form>` : ""}</section>`
  );
}
function ownerPage() {
  if (state.user?.role !== "owner")
    return empty(
      "Owner access required",
      "Owner access is assigned to the confirmed account ID outside the public application.",
    );
  const d = state.ownerData;
  if (!d)
    return (
      heading("Owner overview", "Loading your academy overview…") +
      '<button class="small-button" id="load-owner">Load overview</button>'
    );
  return (
    heading(
      "Owner overview",
      "Academy-wide users, schools, classes, courses, grades and email status.",
      "ACADEMY MANAGEMENT",
      '<button class="small-button" id="load-owner">Refresh overview</button>',
    ) +
    `<section class="stats">${[
      [d.users.length, "Accounts"],
      [d.classes.length, "Classes"],
      [d.grades.length, "Course grades"],
    ]
      .map(
        ([n, t]) =>
          `<div class="stat"><span class="stat-value">${n}</span><strong>${t}</strong></div>`,
      )
      .join(
        "",
      )}</section><section class="workspace-panel"><h2>All accounts & schools</h2><div class="table-wrap"><table><thead><tr><th>Account</th><th>Role</th><th>School / teaching details</th></tr></thead><tbody>${d.users.map((u) => `<tr><td><strong>${escapeHtml(u.name)}</strong><small>${escapeHtml(u.email)} · ${u.account_id}</small></td><td>${escapeHtml(u.role)}</td><td>${escapeHtml(u.school || "—")}<small>${escapeHtml([u.location, u.department, u.job_title].filter(Boolean).join(" · "))}</small></td></tr>`).join("")}</tbody></table></div></section><section class="workspace-panel"><h2>All classes</h2><div class="table-wrap"><table><thead><tr><th>Class</th><th>Teacher</th><th>Join code</th></tr></thead><tbody>${d.classes.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.teacher_name)}</td><td>${c.code}</td></tr>`).join("")}</tbody></table></div></section><section class="workspace-panel"><h2>All course grades</h2><div class="table-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Grade</th><th>Completed</th></tr></thead><tbody>${d.grades.map((g) => `<tr><td>${escapeHtml(g.student_name)}</td><td>${escapeHtml(courseName(g.course_id))}</td><td>${g.percentage}% · ${g.letter}</td><td>${escapeHtml(g.completed_at)} UTC</td></tr>`).join("")}</tbody></table></div></section><section class="workspace-panel"><h2>Email notifications</h2><div class="table-wrap"><table><thead><tr><th>Teacher</th><th>Course</th><th>Status</th><th>Attempts</th></tr></thead><tbody>${d.notifications.map((n) => `<tr><td>${escapeHtml(n.teacher_email)}</td><td>${escapeHtml(courseName(n.course_id))}</td><td>${emailLabel(n.status)}</td><td>${n.attempts}</td></tr>`).join("")}</tbody></table></div></section><h2>All ${d.courses.length} courses</h2><div class="course-grid">${d.courses.map(courseCard).join("")}</div>`
  );
}
function resources() {
  return (
    heading(
      "Learning & grading guidance",
      "How lessons, classes and course grades fit together.",
      "YOUR WORKSHOP COMPANION",
    ) +
    `<div class="resource-grid"><section class="resource-panel"><h2>Three levels of learning</h2><dl><dt>Beginner · 5 lessons, 15 questions + a workshop check</dt><dd>Core vocabulary, components and system functions.</dd><dt>Intermediate · 5 lessons, 15 questions + a workshop check</dt><dd>Measurements, system relationships and diagnostic evidence.</dd><dt>Advanced · 5 lessons, 15 questions + a workshop check</dt><dd>Fault patterns, data interpretation and case-based reasoning.</dd></dl><p>Every course starts at Beginner. Finishing a level gives you a grade and unlocks the next one. After Advanced, the course shows as Completed. Courses a teacher assigns to your class are open right away.</p><p>Teachers choose the lesson count for their own courses, from 1 to 20.</p></section><section class="resource-panel"><h2>How grades work</h2><p>Each lesson includes one assessment question worth one point. Your first submitted answer is final. Read the lesson before submitting.</p><p>A course grade is issued after every lesson has an answer. The percentage is correct answers divided by the number of lessons, rounded to a whole number.</p><p>A: 90–100 · B: 80–89 · C: 70–79 · D: 60–69 · F: below 60.</p><p>Earlier progress is preserved. Existing learners need to submit answers under this grading system to receive a grade.</p></section><section class="resource-panel"><h2>Teachers & classrooms</h2><p>Teachers provide their school, location, program and teaching role at signup. These details are self-reported. Teachers create classes and share an 8-character join code with students.</p><p>A teacher sees grades only for courses assigned to their classes. Joining a class with a previously completed assigned course shares that existing grade. Teacher-created courses are visible only to their author, assigned students and the owner.</p><p>Email notifications are also submitted to the hosting mail server. Mail-server acceptance does not confirm inbox delivery.</p></section><section class="resource-panel"><h2>Before entering a real workshop</h2><p>These lessons teach concepts with simplified diagrams. Even advanced courses do not replace hands-on training, qualifications, manufacturer service information or safety procedures.</p><p>High-voltage, refrigerant, high-pressure fuel and ADAS work requires the appropriate training and exact vehicle procedures.</p><p>Reference reading: <a href="https://www.boschcarservice.com/gb/en/services/adas-calibration/" target="_blank" rel="noopener noreferrer">Bosch ADAS calibration</a>, <a href="https://www.denso-am.eu/products/ac-engine-cooling/expansion-valves" target="_blank" rel="noopener noreferrer">DENSO expansion valves</a>, <a href="https://www.nhtsa.gov/emergency-response-guides" target="_blank" rel="noopener noreferrer">manufacturer EV response guides via NHTSA</a>.</p></section></div>`
  );
}
function route() {
  const p = location.hash.replace("#", "").split("/").filter(Boolean);
  state.view = p[0] || "dashboard";
  state.choice = null;
  state.busy = false;
  render();
  window.scrollTo(0, 0);
  if (state.view === "owner" && state.user?.role === "owner") loadOwner();
}
function render() {
  const pages = {
    dashboard,
    courses: library,
    progress: progressPage,
    course: lesson,
    classroom,
    teaching: gradebook,
    author: authorPage,
    account,
    owner: ownerPage,
    resources,
  };
  $("#app").innerHTML = shell((pages[state.view] || dashboard)());
  bind();
}
function choose(value) {
  const p = location.hash.split("/");
  if (state.busy || state.attempts[p[1]]?.[Number(p[2] || 0)]) return;
  const y = scrollY;
  state.choice = value;
  render();
  window.scrollTo(0, y);
  $(`[data-choice="${value}"]`)?.focus({ preventScroll: true });
}
function makeClickable(g) {
  if (g.dataset.part !== "crankshaft") return;
  const box = g.getBBox(),
    hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  for (const [key, value] of Object.entries({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    fill: "transparent",
    "pointer-events": "all",
  }))
    hit.setAttribute(key, String(value));
  g.insertBefore(hit, g.firstChild);
}
async function mutate(action, data, message) {
  if (state.busy) return;
  state.busy = true;
  try {
    Object.assign(state, await api(action, data));
    render();
    if (message) toast(message);
  } catch (e) {
    toast(e.message);
  } finally {
    state.busy = false;
  }
}
function bind() {
  document
    .querySelectorAll("[data-auth]")
    .forEach((b) => (b.onclick = () => openAuth(b.dataset.auth)));
  $("#account-button").onclick = () =>
    state.user
      ? mutate("logout", {}, "You have been signed out.")
      : openAuth("login");
  $(".mobile-menu").onclick = () =>
    $(".sidebar").classList.toggle("mobile-open");
  document
    .querySelectorAll(".nav-link")
    .forEach(
      (a) => (a.onclick = () => $(".sidebar").classList.remove("mobile-open")),
    );
  document.querySelectorAll("[data-level]").forEach(
    (b) =>
      (b.onclick = () => {
        state.level = b.dataset.level;
        render();
      }),
  );
  $("#course-search")?.addEventListener("input", (e) => {
    state.query = e.target.value;
    $("#course-results").innerHTML = filteredCards();
  });
  for (const [id, key] of [
    ["#category-filter", "filter"],
    ["#level-filter", "level"],
  ])
    $(id)?.addEventListener("change", (e) => {
      state[key] = e.target.value;
      $("#course-results").innerHTML = filteredCards();
    });
  const showPart = (id) => {
    const c = courseById(location.hash.split("/")[1]);
    if (!c?.explore?.[id]) return;
    state.explorePart = { course: c.id, id };
    const y = scrollY;
    render();
    window.scrollTo(0, y);
  };
  document.querySelectorAll(".explorer [data-part]").forEach((g) => {
    g.classList.toggle("is-selected", state.explorePart?.id === g.dataset.part);
    g.onclick = () => showPart(g.dataset.part);
    g.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showPart(g.dataset.part);
      }
    };
  });
  document
    .querySelectorAll("[data-explore]")
    .forEach((b) => (b.onclick = () => showPart(b.dataset.explore)));
  document
    .querySelectorAll("[data-choice]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          choose(
            b.dataset.choiceType === "quiz"
              ? Number(b.dataset.choice)
              : b.dataset.choice,
          )),
    );
  const p = location.hash.split("/"),
    record = state.attempts[p[1]]?.[Number(p[2] || 0)];
  document.querySelectorAll(".diagram-wrap [data-part]").forEach((g) => {
    makeClickable(g);
    g.classList.toggle(
      "is-selected",
      (record ? record.choice : state.choice) === g.dataset.part,
    );
    if (record) {
      g.setAttribute("tabindex", "-1");
      g.setAttribute("aria-disabled", "true");
    }
    g.onclick = () => choose(g.dataset.part);
    g.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose(g.dataset.part);
      }
    };
  });
  $("#check-answer")?.addEventListener("click", async () => {
    if (!state.user) return openAuth("register");
    if (state.choice === null || state.busy) return;
    const hash = location.hash,
      choice = state.choice;
    state.busy = true;
    render();
    try {
      Object.assign(
        state,
        await api("answer", {
          course: p[1],
          activity: Number(p[2] || 0),
          choice,
        }),
      );
      if (location.hash === hash) state.choice = null;
    } catch (e) {
      toast(e.message);
    } finally {
      state.busy = false;
      render();
    }
  });
  document.querySelectorAll("[data-copy]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(b.dataset.copy);
          toast("Copied to clipboard.");
        } catch {
          toast("Copy this code: " + b.dataset.copy);
        }
      }),
  );
  $("#create-class")?.addEventListener("submit", (e) => {
    e.preventDefault();
    mutate(
      "create_class",
      Object.fromEntries(new FormData(e.target)),
      "Class created. Share the join code with students.",
    );
  });
  $("#join-class")?.addEventListener("submit", (e) => {
    e.preventDefault();
    mutate(
      "join_class",
      Object.fromEntries(new FormData(e.target)),
      "You joined the class. Assigned grades are shared with your teacher.",
    );
  });
  document.querySelectorAll(".assign-form").forEach(
    (f) =>
      (f.onsubmit = (e) => {
        e.preventDefault();
        mutate(
          "assign",
          {
            class_id: Number(f.dataset.class),
            course: new FormData(f).get("course"),
          },
          "Course assigned to your class.",
        );
      }),
  );
  $("#refresh-grades")?.addEventListener("click", () =>
    mutate(
      "send_notifications",
      {},
      "Gradebook refreshed. Eligible email notifications retried.",
    ),
  );
  $("#notification-settings")?.addEventListener("submit", (e) => {
    e.preventDefault();
    mutate(
      "profile",
      {
        email_notifications: new FormData(e.target).has("email_notifications"),
      },
      "Notification preferences saved.",
    );
  });
  $("#add-lesson")?.addEventListener("click", () => {
    if (document.querySelectorAll(".lesson-editor").length >= 20)
      return toast("Courses can contain up to 20 lessons.");
    $("#lesson-editors").insertAdjacentHTML("beforeend", lessonEditor());
    bindEditorRemovals();
    updateEditorCount();
  });
  bindEditorRemovals();
  $("#course-editor")?.addEventListener("submit", publishCourse);
  $("#load-owner")?.addEventListener("click", loadOwner);
}
function updateEditorCount() {
  const n = document.querySelectorAll(".lesson-editor").length;
  $("#editor-count").textContent = n + " lesson" + (n === 1 ? "" : "s");
}
function bindEditorRemovals() {
  document.querySelectorAll(".remove-lesson").forEach(
    (b) =>
      (b.onclick = () => {
        if (document.querySelectorAll(".lesson-editor").length === 1)
          return toast("Keep at least one lesson.");
        b.closest(".lesson-editor").remove();
        updateEditorCount();
      }),
  );
}
async function publishCourse(e) {
  e.preventDefault();
  if (state.busy) return;
  state.busy = true;
  const form = e.target,
    data = Object.fromEntries(new FormData(form));
  data.lessons = [...form.querySelectorAll(".lesson-editor")].map((el) => {
    const l = {};
    el.querySelectorAll("[data-field]").forEach(
      (f) => (l[f.dataset.field] = f.value),
    );
    l.answer = Number(l.answer);
    l.diagram = l.diagram || null;
    l.options = [...el.querySelectorAll("[data-option]")].map((f) => f.value);
    return l;
  });
  $("#publish-course").disabled = true;
  $("#editor-error").textContent = "";
  try {
    Object.assign(state, await api("create_course", data));
    location.hash = "#classroom";
    toast("Course published. Assign it to one of your classes.");
  } catch (err) {
    $("#editor-error").textContent = err.message;
    $("#publish-course").disabled = false;
  } finally {
    state.busy = false;
  }
}
async function loadOwner() {
  if (state.user?.role !== "owner") return;
  try {
    state.ownerData = await api("owner");
    if (state.view === "owner") render();
  } catch (e) {
    toast(e.message);
  }
}
let authMode = "login",
  authStep = 0;
const authRole = () =>
  $('#auth-form [name="role"]:checked')?.value || "student";
function openAuth(mode = "login") {
  authMode = mode;
  authStep = 0;
  updateAuth();
  if (!$("#auth").open) $("#auth").showModal();
}
function updateAuth() {
  const registering = authMode === "register",
    teacher = authRole() === "teacher";
  $("#auth-error").textContent = "";
  $("#auth-title").textContent = !registering
    ? "Welcome back."
    : authStep === 0
      ? "How will you use Axiomate?"
      : authStep === 1
        ? "Your account details."
        : "Tell us about your school.";
  $("#auth-copy").textContent = !registering
    ? "Sign in to your student or teacher workspace."
    : authStep === 0
      ? "Choose the workspace that fits your role."
      : authStep === 1
        ? "Your progress and grades are saved to this account."
        : "Provide your school and teaching role to create a teacher workspace.";
  $("#role-step").hidden = !registering || authStep !== 0;
  $("#details-step").hidden = registering && authStep !== 1;
  $("#school-step").hidden = !registering || authStep !== 2;
  $("#name-field").hidden = !registering;
  $("#name-field input").required = registering;
  $("#auth-submit").textContent = !registering
    ? "Sign in"
    : authStep === 0
      ? "Continue"
      : authStep === 1 && teacher
        ? "Continue to school details"
        : "Create " + (teacher ? "teacher" : "student") + " account";
  $("#auth-back").hidden = !registering || authStep === 0;
  $("#auth-toggle").textContent = registering
    ? "Already have an account? Sign in"
    : "New here? Create an account";
  const pw = $('#auth-form [name="password"]');
  pw.autocomplete = registering ? "new-password" : "current-password";
  pw.minLength = registering ? 10 : 1;
  pw.placeholder = registering ? "At least 10 characters" : "Your password";
  $("#auth-step-label").textContent = registering
    ? `STEP ${authStep + 1} / ${teacher ? 3 : 2}`
    : "YOUR WORKSPACE";
}
$("#auth-toggle").onclick = () => {
  authMode = authMode === "login" ? "register" : "login";
  authStep = 0;
  updateAuth();
};
$("#auth-back").onclick = () => {
  authStep = Math.max(0, authStep - 1);
  updateAuth();
};
document
  .querySelectorAll('[name="role"]')
  .forEach((r) => (r.onchange = updateAuth));
$(".close").onclick = () => $("#auth").close();
$("#auth").addEventListener("click", (e) => {
  if (e.target === $("#auth")) {
    const r = $("#auth").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      $("#auth").close();
  }
});
$("#auth-form").onsubmit = async (e) => {
  e.preventDefault();
  const registering = authMode === "register",
    teacher = authRole() === "teacher";
  const section = !registering
    ? "#details-step"
    : authStep === 0
      ? "#role-step"
      : authStep === 1
        ? "#details-step"
        : "#school-step";
  for (const field of document.querySelectorAll(`${section} input`)) {
    if (!field.closest("[hidden]") && !field.reportValidity()) return;
  }
  if (registering && (authStep === 0 || (authStep === 1 && teacher))) {
    authStep++;
    updateAuth();
    return;
  }
  const b = $("#auth-submit");
  b.disabled = true;
  $("#auth-error").textContent = "";
  try {
    Object.assign(
      state,
      await api(authMode, Object.fromEntries(new FormData(e.target))),
    );
    state.ownerData = null;
    $("#auth").close();
    e.target.reset();
    render();
    if (registering && isTeacher()) location.hash = "#classroom";
    toast(
      registering
        ? "Your " + roleName().toLowerCase() + " workspace is ready."
        : "Welcome back. Your workspace is ready.",
    );
  } catch (error) {
    $("#auth-error").textContent = error.message;
  } finally {
    b.disabled = false;
  }
};
window.addEventListener("hashchange", route);
api("session")
  .then((r) => {
    Object.assign(state, r);
    route();
  })
  .catch((e) => {
    $("#app").innerHTML =
      '<div class="startup-error"><img src="/assets/mark.svg" alt="Axiomate"><h1>The workshop is taking a moment.</h1><p></p><button class="primary" id="retry">Try again</button></div>';
    $(".startup-error p").textContent = e.message;
    $("#retry").onclick = () => location.reload();
  });
