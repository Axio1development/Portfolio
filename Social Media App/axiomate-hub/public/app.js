const app = document.querySelector("#app"),
  modal = document.querySelector("#modal");
let me = null,
  csrf = "",
  view = "all",
  profileId = null,
  search = "",
  posts = [],
  busy = false,
  authMode = "login",
  feedRequest = 0;
const oldIcons = {
  home: "⌂",
  explore: "⌕",
  bookmarks: "▱",
  profile: "♙",
  logout: "↗",
  arrow: "↗",
  like: "♡",
  reply: "↳",
  share: "↗",
  close: "×",
};
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const avatar = (person, cls = "") => renderAvatar(person, cls);
const logo = () =>
  `<img src="mark.svg" alt="" class="brand-mark"><span>AXIOMATE<span class="brand-sub">HUB <i> / </i> GAMES</span></span>`;
function toast(message) {
  const t = document.querySelector("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 4000);
}
async function api(action, data, params = {}) {
  const response = await fetch(
    "api.php?" + new URLSearchParams({ action, ...params }),
    {
      method: data ? "POST" : "GET",
      headers: data
        ? { "Content-Type": "application/json", "X-CSRF-Token": csrf }
        : {},
      body: data ? JSON.stringify(data) : undefined,
    },
  );
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error("The Hub could not be reached. Please try again.");
  }
  if (!response.ok) throw Error(result.error || "Something went wrong.");
  return result;
}
async function start() {
  try {
    const session = await api("session");
    me = session.user;
    csrf = session.csrf;
    if (me) {
      await loadPreferences();
      await shell();
      await openPermalink();
      await showVerificationBanner();
    } else auth();
    openVerificationLink();
  } catch (e) {
    app.innerHTML = `<main class="unavailable"><img src="mark.svg" width="64" alt="Axiomate"><h1>The shadows are gathering.</h1><p>${esc(e.message)}</p><button data-action="retry" class="primary">Try again</button></main>`;
  }
}
function auth() {
  app.innerHTML = `<main class="auth-layout"><section class="auth-art"><a class="brand" href="/">${logo()}</a><div class="orbital o1"></div><div class="orbital o2"></div><div class="shadow-emblem" aria-hidden="true"><span>A</span></div><div class="auth-story"><div class="eyebrow"><span class="live-dot"></span> THE AXIOMATE GAMES COMMUNITY</div><h1>Every legend<br>begins in the <em>shadows.</em></h1><p>Find your party. Share your world.<br>This is where our next chapter begins.</p><div class="auth-tags"><span>GAMERS</span><i>✦</i><span>CREATORS</span><i>✦</i><span>WORLDBUILDERS</span></div></div><div class="art-footer"><span>AXIOMATE GAMES © ${new Date().getFullYear()}</span><span>ARISE TOGETHER ↗</span></div></section><section class="auth-panel"><div class="auth-top">A WORLD BUILT BY US <span>✦</span></div><div class="auth-box"><span class="section-number">01 / ENTER THE HUB</span><h2>${authMode === "login" ? "Welcome to<br>your next realm." : "Your story<br>starts here."}</h2><p class="muted">${authMode === "login" ? "Sign in to join the Axiomate community." : "Create your account. Find your people."}</p><div class="auth-switch"><button data-action="auth-login" class="${authMode === "login" ? "active" : ""}">Sign in</button><button data-action="auth-register" class="${authMode === "register" ? "active" : ""}">Create account</button></div><form id="auth-form">${authMode === "register" ? '<label>Display name<input name="name" autocomplete="name" maxlength="40" placeholder="What should we call you?" required></label><label>Username<input name="username" autocomplete="username" pattern="[A-Za-z0-9_]{3,20}" maxlength="20" placeholder="Your unique handle" required></label><label>Email address<input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label>' : '<label>Username or email<input name="login" autocomplete="username webauthn" placeholder="Enter your username or email" required></label>'}<label>Password<input type="password" name="password" autocomplete="${authMode === "login" ? "current-password" : "new-password"}" ${authMode === "register" ? 'minlength="12"' : ""} maxlength="72" placeholder="${authMode === "login" ? "Enter your password" : "At least 12 characters"}" required></label><p class="form-error" role="alert"></p><button class="primary auth-submit" type="submit">${authMode === "login" ? "Enter the Hub" : "Join the shadows"} <span>↗</span></button></form>${loginExtras()}<p class="auth-note"><span>◇</span> A members-only space. Your next party awaits.</p></div><div class="auth-bottom">ONE COMMUNITY. INFINITE POSSIBILITIES.</div></section></main>`;
  restoreLogin();
  polishIcons();
}
async function shell() {
  app.innerHTML = `<div class="hub-layout"><aside class="sidebar"><a href="#" class="brand" data-action="home">${logo()}</a><div class="workspace-label">YOUR REALM</div><nav aria-label="Main navigation"><button data-action="home" data-nav="all">${icons.home}<span>Home</span><i class="nav-dot"></i></button><button data-action="explore" data-nav="explore">${icons.explore}<span>Explore</span></button><button data-action="bookmarks" data-nav="bookmarks">${icons.bookmarks}<span>Bookmarks</span></button><button data-action="profile" data-nav="profile">${icons.profile}<span>Profile</span></button><button data-action="activity" data-nav="activity">${icons.activity}<span>Activity</span><span class="unread-dot" hidden></span></button><button data-action="settings" data-nav="settings">${icons.settings}<span>Settings</span></button></nav><button class="primary compose-button" data-action="compose">Create a post <span>＋</span></button><div class="sidebar-card"><span class="mini-star">✦</span><span>THE NEXT CHAPTER</span><h3>Built by players.<br>For players.</h3><p>Welcome to the world of<br>Axiomate Games.</p><a href="https://axiomategames.com" target="_blank" rel="noopener">Discover our world ↗</a></div><div class="sidebar-bottom"><div class="member-mini">${avatar(me)}<div><strong>${esc(me.name)}</strong><small>@${esc(me.username)}</small></div><button data-action="logout" class="icon-button" aria-label="Sign out">↗</button></div><span class="copyright">© ${new Date().getFullYear()} AXIOMATE GAMES</span></div></aside><main class="feed-main"><header class="main-header"><div><span class="eyebrow">AXIOMATE COMMUNITY</span><h1 id="page-title">The Hub<span>✦</span></h1></div><div class="header-tools"><button data-action="activity" class="icon-button activity-header" aria-label="Activity" title="Activity">${icons.activity}<span class="unread-dot" hidden></span></button><button data-action="refresh" class="icon-button" aria-label="Refresh feed" title="Refresh feed">${icons.refresh}</button><button data-action="settings" class="icon-button" aria-label="Settings" title="Settings">${icons.settings}</button></div></header><div id="view-content"></div><div id="post-list" aria-live="polite"></div><div id="load-more"></div><footer class="feed-footer">YOU'RE PART OF SOMETHING GREATER. <span>✦</span></footer></main><aside class="rightbar"><form class="search-box" id="search-form"><span>⌕</span><input aria-label="Search the Hub" name="q" placeholder="Search the Hub" maxlength="100"><kbd>↵</kbd></form><section class="realm-card"><div class="realm-lines"></div><span class="eyebrow">WELCOME TO THE SHADOWS</span><div class="realm-symbol">A</div><h2>A new world.<br>Your people.</h2><p>The official gathering place<br>for Axiomate Games.</p><span class="realm-label">THE JOURNEY STARTS WITH US ↗</span></section><section class="right-section"><div class="section-heading"><h3>Find your party</h3><span>✦</span></div><div id="members"></div></section><section class="right-section"><div class="section-heading"><h3>Community code</h3><span>↗</span></div><p class="code-copy">Respect every player. Celebrate the wins. Keep spoilers marked. Make room for the next legend.</p><div class="code-tags"><span>#AxiomateGames</span><span>#AriseTogether</span></div></section><footer class="right-footer">AXIOMATE HUB <span>·</span> EST. ${new Date().getFullYear()}<br>A place to belong. A world to build.</footer></aside></div><nav class="mobile-nav" aria-label="Mobile navigation"><button data-action="home" aria-label="Home">⌂</button><button data-action="explore" aria-label="Explore">⌕</button><button data-action="compose" aria-label="New post">＋</button><button data-action="bookmarks" aria-label="Bookmarks">▱</button><button data-action="profile" aria-label="Profile">♙</button><button data-action="settings" aria-label="Settings">${icons.settings}</button></nav>`;
  await renderView();
  loadMembers();
  refreshActivity();
  polishIcons();
}
function composer() {
  return `<form id="post-form" class="composer">${avatar(me)}<div class="compose-inner"><label class="sr-only" for="post-body">Your post</label><textarea id="post-body" name="body" placeholder="What’s happening in your world?" maxlength="500" required></textarea><div id="video-attachment"></div><div id="video-upload-status" hidden aria-live="polite"></div><p class="video-hint">MP4 or WebM / up to 50 MB</p><div class="composer-bottom"><span class="compose-tools">${videoTools()}<button type="button" data-action="emoji" aria-label="Add emoji" title="Add emoji">${icons.smile}</button><span id="draft-status">Share a thought. Start a story.</span></span><div><small id="char-count">0 / 500</small><button type="submit" class="primary small">Post ↗</button></div></div><p class="form-error" role="alert"></p></div></form>`;
}
async function renderView() {
  ++feedRequest;
  const content = document.querySelector("#view-content");
  document
    .querySelectorAll("[data-nav]")
    .forEach((b) => b.classList.toggle("active", b.dataset.nav === view));
  document.querySelector("#page-title").innerHTML =
    ({
      all: "The Hub",
      following: "The Hub",
      explore: "Explore",
      bookmarks: "Bookmarks",
      profile: "Player profile",
    }[view] || "The Hub") + "<span>✦</span>";
  search = "";
  profileId = view === "profile" ? profileId || me.id : null;
  if (view === "settings" || view === "activity") {
    document.querySelector("#post-list").innerHTML = "";
    document.querySelector("#load-more").innerHTML = "";
    document.querySelector("#page-title").innerHTML =
      view === "settings" ? "Settings" : "Activity";
    if (view === "settings") await renderSettings();
    else await renderActivity();
    polishIcons();
    return;
  }
  if (view === "profile") {
    const m = await api("member", null, { id: profileId });
    content.innerHTML = `<section class="profile-card" data-accent="${esc(m.accent)}">${profileCover(m)}<div class="profile-info">${avatar(m, "large")}<div class="profile-actions">${m.id === me.id ? '<button class="outline" data-action="edit-profile">Edit profile</button>' : `<button class="outline" data-action="follow" data-id="${m.id}">${m.following ? "Following" : "Follow"}</button>`}</div><h2>${esc(m.name)}</h2><p class="muted">@${esc(m.username)}</p><p class="bio">${esc(m.bio || "A new legend in the making.")}</p>${profileExtras(m)}<small class="muted">Joined ${new Date(m.created_at.replace(" ", "T") + "Z").toLocaleDateString(undefined, { month: "long", year: "numeric" })} · ${m.followers} followers · ${m.following_count} following</small></div></section><div class="feed-tabs"><span class="selected">Posts</span></div>`;
  } else if (view === "bookmarks")
    content.innerHTML =
      '<div class="view-intro"><h2>Your saved discoveries.</h2><p>Keep the posts you want to come back to.</p></div>';
  else if (view === "explore")
    content.innerHTML =
      '<div class="view-intro"><span class="eyebrow">DISCOVER YOUR NEXT OBSESSION</span><h2>Every player has a story.</h2><p>Search posts, names, or handles across the community.</p><form id="explore-form" class="search-box"><span>⌕</span><input name="q" placeholder="Find something worth sharing…" aria-label="Search posts" maxlength="100"><button class="outline" type="submit">Search</button></form><div class="topic-buttons"><button data-action="topic" data-topic="#AxiomateGames">#AxiomateGames</button><button data-action="topic" data-topic="#AriseTogether">#AriseTogether</button><button data-action="topic" data-topic="#Gaming">#Gaming</button></div></div>';
  else
    content.innerHTML = `<section class="welcome-banner"><div><span class="eyebrow">YOUR WORLD. YOUR COMMUNITY.</span><h2>Welcome to the shadows<span>.</span></h2><p>Good games bring us together. Great stories keep us here.</p></div><span class="banner-star">✦</span></section><div class="feed-tabs"><button data-action="tab-all" class="${view === "all" ? "selected" : ""}">For you</button><button data-action="tab-following" class="${view === "following" ? "selected" : ""}">Following</button><span class="feed-sort">LATEST FIRST ↓</span></div>${composer()}`;
  await loadFeed();
  restoreDraft();
  renderVideoSelection();
  polishIcons();
}
async function loadMembers() {
  try {
    const members = await api("members");
    const el = document.querySelector("#members");
    if (el)
      el.innerHTML = members.length
        ? members
            .map(
              (m) =>
                `<div class="suggestion"><button class="member-link" data-action="member" data-id="${m.id}">${avatar(m)}<span><strong>${esc(m.name)}</strong><small>@${esc(m.username)}</small></span></button><button class="follow-button ${m.following ? "is-following" : ""}" data-action="follow" data-id="${m.id}" aria-label="${m.following ? "Unfollow" : "Follow"} ${esc(m.username)}">${m.following ? "✓" : "＋"}</button></div>`,
            )
            .join("")
        : '<p class="code-copy">The party is just getting started. New members will appear here.</p>';
  } catch (e) {
    toast(e.message);
  }
}
function postCard(p) {
  postCache.set(Number(p.id), p);
  return `<article class="post" data-post="${p.id}"><button class="avatar-button" data-action="member" data-id="${p.user_id}" aria-label="View ${esc(p.name)} profile">${avatar(p)}</button><div class="post-content"><div class="post-top"><button class="post-author" data-action="member" data-id="${p.user_id}">${esc(p.name)}</button><span>@${esc(p.username)}</span><span>·</span><time datetime="${p.created_at.replace(" ", "T")}Z">${timeAgo(p.created_at)}</time>${p.user_id === me.id ? `<button class="delete-button" data-action="delete" data-id="${p.id}" aria-label="Delete post">×</button>` : ""}</div><p class="post-body">${richText(p.body)}</p>${videoAttachment(p)}<div class="post-actions"><button data-action="reply" data-id="${p.id}" aria-label="Reply to post">↳ <span>${p.replies || ""}</span></button><button data-action="like" data-id="${p.id}" class="${p.liked ? "liked" : ""}" aria-label="${p.liked ? "Unlike" : "Like"} post">${p.liked ? "♥" : "♡"} <span>${p.likes || ""}</span></button><button data-action="bookmark" data-id="${p.id}" class="${p.bookmarked ? "saved" : ""}" aria-label="${p.bookmarked ? "Remove bookmark" : "Bookmark post"}">${p.bookmarked ? "▰" : "▱"}</button><button data-action="share" data-id="${p.id}" aria-label="Copy post text">↗</button></div></div></article>`;
}
function timeAgo(value) {
  const d = new Date(value.replace(" ", "T") + "Z"),
    seconds = Math.max(0, (Date.now() - d) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
async function loadFeed(append = false) {
  const request = ++feedRequest;
  const list = document.querySelector("#post-list");
  if (!append)
    list.innerHTML = '<div class="loading">Gathering the latest…</div>';
  const params = { view, q: search };
  if (profileId) params.user = profileId;
  if (append && posts.length) params.before = posts.at(-1).id;
  try {
    const incoming = await api("feed", null, params);
    if (request !== feedRequest) return;
    posts = append ? [...posts, ...incoming] : incoming;
    list.innerHTML = posts.length
      ? posts.map(postCard).join("")
      : `<section class="empty-state"><div>✦</div><span class="eyebrow">${view === "bookmarks" ? "YOUR COLLECTION STARTS HERE" : "A NEW CHAPTER"}</span><h2>${search ? "No discoveries just yet." : view === "following" ? "Find your party." : view === "bookmarks" ? "Worth coming back to." : "Be the first to break the silence."}</h2><p>${search ? "Try another name, word, or hashtag." : view === "following" ? "Follow community members to see their posts here." : view === "bookmarks" ? "Tap the bookmark on any post to save it here." : "Share what you’re playing, creating, or dreaming up."}</p>${["all", "profile"].includes(view) && !search ? '<button class="outline" data-action="compose">Start a conversation ↗</button>' : ""}</section>`;
    document.querySelector("#load-more").innerHTML =
      incoming.length === 30
        ? '<button class="outline load-more" data-action="more">Load more posts ↓</button>'
        : "";
  } catch (e) {
    if (request === feedRequest)
      list.innerHTML =
        '<div class="empty-state"><p>' +
        esc(e.message) +
        '</p><button class="outline" data-action="refresh">Try again</button></div>';
  }
}
function openModal(html) {
  modal.innerHTML = `<button class="modal-close icon-button" data-action="close" aria-label="Close dialog">×</button>${html}`;
  if (!modal.open) modal.showModal();
}
async function replies(id) {
  const p = postCache.get(id) || posts.find((p) => p.id === id);
  if (!p) return;
  activeThread = id;
  openModal(
    `<h2>Conversation</h2>${postCard(p)}<form id="reply-form" data-id="${id}"><label>Your reply<textarea name="body" maxlength="500" placeholder="Add to the conversation…" required></textarea></label><p class="form-error" role="alert"></p><button class="primary small">Reply ↗</button></form><div id="replies"><p class="muted">Loading replies…</p></div>`,
  );
  try {
    const items = await api("feed", null, { parent: id });
    const el = document.querySelector("#replies");
    if (el)
      el.innerHTML = items.length
        ? items.map(postCard).join("")
        : '<p class="muted reply-empty">Be the first to reply.</p>';
  } catch (e) {
    toast(e.message);
  }
}
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  event.preventDefault();
  const action = button.dataset.action,
    id = Number(button.dataset.id);
  try {
    if (await extraAction(action, button, id)) return;
    if (action === "retry") {
      await start();
      return;
    }
    if (action.startsWith("auth-")) {
      authMode = action === "auth-login" ? "login" : "register";
      auth();
      return;
    }
    if (action === "close") {
      modal.close();
      return;
    }
    if (action === "logout") {
      await api("logout", {});
      me = null;
      view = "all";
      profileId = null;
      postCache.clear();
      authMode = "login";
      modal.close();
      await start();
      return;
    }
    if (
      [
        "home",
        "explore",
        "bookmarks",
        "profile",
        "member",
        "tab-all",
        "tab-following",
      ].includes(action)
    ) {
      view =
        {
          home: "all",
          "tab-all": "all",
          "tab-following": "following",
          member: "profile",
        }[action] || action;
      profileId =
        action === "member" ? id : action === "profile" ? me.id : null;
      await renderView();
      window.scrollTo({ top: 0 });
      return;
    }
    if (action === "topic") {
      search = button.dataset.topic;
      await loadFeed();
      return;
    }
    if (action === "compose") {
      if (!["all", "following"].includes(view)) {
        view = "all";
        await renderView();
      }
      document.querySelector("#post-body")?.focus();
      document
        .querySelector("#post-form")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (action === "refresh") {
      await loadFeed();
      return;
    }
    if (action === "more") {
      await loadFeed(true);
      return;
    }
    if (action === "follow") {
      button.disabled = true;
      const r = await api("follow", { id });
      button.textContent = r.active ? "✓" : "＋";
      button.setAttribute(
        "aria-label",
        r.active ? "Unfollow member" : "Follow member",
      );
      await loadMembers();
      if (view === "profile") await renderView();
      return;
    }
    if (action === "edit-profile") {
      openModal(
        `<h2>Make it yours.</h2><p class="muted">Let the community know who you are.</p><form id="profile-form"><label>Display name<input name="name" value="${esc(me.name)}" maxlength="40" required></label><label>Bio<textarea name="bio" maxlength="160" placeholder="What’s your story?">${esc(me.bio)}</textarea></label><p class="form-error" role="alert"></p><button class="primary">Save profile ↗</button></form>`,
      );
      return;
    }
    if (action === "reply") {
      await replies(id);
      return;
    }
    if (action === "delete") {
      openModal(
        `<h2>Delete this post?</h2><p class="muted">This will also remove its replies. This cannot be undone.</p><div class="dialog-actions"><button class="outline" data-action="close">Keep post</button><button class="primary" data-action="confirm-delete" data-id="${id}">Delete post</button></div>`,
      );
      return;
    }
    if (action === "confirm-delete") {
      await api("delete", { id });
      modal.close();
      await loadFeed();
      toast("Post deleted.");
      return;
    }
    if (action === "like" || action === "bookmark") {
      button.disabled = true;
      await api(action, { id });
      if (modal.open) {
        await loadFeed();
        await replies(id);
      } else await loadFeed();
      return;
    }
    if (action === "share") {
      const p = posts.find((p) => p.id === id);
      if (p) {
        await navigator.clipboard.writeText(
          `${p.name} (@${p.username}) on Axiomate Hub:\n\n${p.body}\n\nhttps://axiomatehub.com`,
        );
        toast("Post copied. Share it with your party.");
      }
    }
  } catch (e) {
    toast(e.message);
  } finally {
    button.disabled = false;
  }
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (form.dataset.settingsForm) {
    event.preventDefault();
    await saveSettingsForm(form);
    return;
  }
  if (
    ![
      "auth-form",
      "post-form",
      "profile-form",
      "reply-form",
      "search-form",
      "explore-form",
    ].includes(form.id)
  )
    return;
  event.preventDefault();
  if (busy) return;
  const data = Object.fromEntries(new FormData(form));
  if (["search-form", "explore-form"].includes(form.id)) {
    if (view !== "explore") {
      view = "explore";
      await renderView();
    }
    search = data.q.trim();
    await loadFeed();
    return;
  }
  const submit = form.querySelector('[type="submit"],button');
  const error = form.querySelector(".form-error");
  busy = true;
  if (submit) submit.disabled = true;
  if (error) error.textContent = "";
  try {
    if (form.id === "auth-form") {
      await api(authMode === "login" ? "login" : "register", data);
      rememberLogin(data.login);
      view = "all";
      await start();
    }
    if (form.id === "post-form") {
      await publishPost(data);
      clearDraft();
      form.reset();
      document.querySelector("#char-count").textContent = "0 / 500";
      await loadFeed();
      toast("Your story is out there.");
    }
    if (form.id === "reply-form") {
      const id = Number(form.dataset.id);
      await api("post", { ...data, parent_id: id });
      if (!["activity", "settings"].includes(view)) await loadFeed();
      await openPost(id);
      toast("Reply posted.");
    }
    if (form.id === "profile-form") {
      await api("profile", data);
      me = { ...me, ...data };
      modal.close();
      await shell();
      toast("Profile updated.");
    }
  } catch (e) {
    if (error) error.textContent = e.message;
    else toast(e.message);
  } finally {
    busy = false;
    if (submit) submit.disabled = false;
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "post-body") {
    document.querySelector("#char-count").textContent =
      `${event.target.value.length} / 500`;
    saveDraft(event.target.value);
  }
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    const rect = modal.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      modal.close();
  }
});
start();
