const iconPaths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  explore: "m21 21-5-5M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  bookmarks: "M6 3h12v18l-6-4-6 4Z",
  profile:
    "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3l1-2h4l1 2 3 2 2 0 2 4-1 2v3l1 2-2 4h-2l-3 2-1 1h-4l-1-1-3-2H4l-2-4 1-2v-3L2 9l2-4h2Z",
  activity: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 10h18c0-3-3-3-3-10M10 22h4",
  refresh: "M20 7V2m0 5h-5M4 17v5m0-5h5M20 7A9 9 0 0 0 4 6M4 17a9 9 0 0 0 16 1",
  like: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8",
  reply:
    "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z",
  share: "M12 16V2m-5 5 5-5 5 5M5 12H3v9h18v-9h-2",
  logout: "M9 21H3V3h6m5 14 5-5-5-5m-7 5h12",
  smile:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M8 14s1 3 4 3 4-3 4-3M8 8h.01M16 8h.01",
  key: "M15 7a5 5 0 1 0-4 8l3-3h3v-3h3V5h-4Z",
  close: "m6 6 12 12M6 18 18 6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
};
function icon(name) {
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[name] || iconPaths.arrow}"/></svg>`;
}
const icons = Object.fromEntries(
  Object.keys(iconPaths).map((k) => [k, icon(k)]),
);
const postCache = new Map();
let activeThread = null,
  preferences = {
    theme: "midnight",
    density: "comfortable",
    reduced_motion: false,
  },
  activityTimer;
function polishIcons() {
  document.querySelectorAll("[data-action]").forEach((b) => {
    const a = b.dataset.action;
    let name = {
      home: "home",
      explore: "explore",
      profile: "profile",
      bookmarks: "bookmarks",
      activity: "activity",
      settings: "settings",
      logout: "logout",
      reply: "reply",
      like: "like",
      bookmark: "bookmarks",
      share: "share",
      refresh: "refresh",
      close: "close",
    }[a];
    if (!name) return;
    if (b.querySelector("svg") && !["like", "bookmark"].includes(a)) return;
    if (b.closest(".post-actions")) {
      const count = b.querySelector("span")?.outerHTML || "";
      b.innerHTML = icon(name) + count;
    } else if (b.closest(".mobile-nav") || b.classList.contains("icon-button"))
      b.innerHTML = icon(name);
  });
}
const observer = new MutationObserver(queuePolish);
let polishing = false;
function queuePolish() {
  if (polishing) return;
  polishing = true;
  requestAnimationFrame(() => {
    observer.disconnect();
    polishIcons();
    observer.observe(document.querySelector("#app"), {
      childList: true,
      subtree: true,
    });
    polishing = false;
  });
}
observer.disconnect();
document.addEventListener("DOMContentLoaded", () => {
  observer.observe(document.querySelector("#app"), {
    childList: true,
    subtree: true,
  });
});
function applyPreferences() {
  document.documentElement.dataset.theme = preferences.theme;
  document.documentElement.dataset.density = preferences.density;
  document.documentElement.classList.toggle(
    "reduce-motion",
    preferences.reduced_motion,
  );
}
async function loadPreferences() {
  const result = await api("settings");
  preferences = result.preferences;
  accountDetails = result.account;
  applyPreferences();
}
function storageGet(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
function storageSet(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {}
}
function loginExtras() {
  return `${authMode === "login" ? '<label class="check-row"><input type="checkbox" id="remember-login"> Remember my email or username on this device</label><div class="auth-divider"><span>or</span></div><button class="outline passkey-signin" data-action="passkey-login">' + icon("key") + ' Sign in with a passkey</button><p class="passkey-help">Use your fingerprint, face, PIN, or security key.</p>' : '<p class="privacy-note">Your email stays private. We?ll send a link to confirm it belongs to you.</p>'}`;
}
function restoreLogin() {
  const saved = storageGet("axiomate.remembered-login");
  const field = document.querySelector('[name="login"]');
  if (field && saved) {
    field.value = saved;
    document.querySelector("#remember-login").checked = true;
  }
  if (!window.PublicKeyCredential) {
    document.querySelector(".passkey-signin")?.setAttribute("disabled", "");
    const hint = document.querySelector(".passkey-help");
    if (hint) hint.textContent = "Passkeys are not supported in this browser.";
  }
}
function rememberLogin(login) {
  if (login)
    storageSet(
      "axiomate.remembered-login",
      document.querySelector("#remember-login")?.checked ? login : "",
    );
}
function saveDraft(value) {
  if (!me) return;
  storageSet("axiomate.draft." + me.id, value);
  const status = document.querySelector("#draft-status");
  if (status)
    status.textContent = value
      ? "Draft saved on this device"
      : "Share a thought. Start a story.";
}
function restoreDraft() {
  const field = document.querySelector("#post-body");
  if (field && me) {
    field.value = storageGet("axiomate.draft." + me.id);
    document.querySelector("#char-count").textContent =
      field.value.length + " / 500";
    if (field.value)
      document.querySelector("#draft-status").textContent =
        "Draft saved on this device";
  }
}
function clearDraft() {
  if (me) storageSet("axiomate.draft." + me.id, "");
  const status = document.querySelector("#draft-status");
  if (status) status.textContent = "Share a thought. Start a story.";
}
function richText(body) {
  return esc(body).replace(
    /(^|\s)(#[\p{L}\p{N}_]+)/gu,
    (_, space, tag) =>
      `${space}<button class="inline-tag" data-action="topic" data-topic="${tag}">${tag}</button>`,
  );
}
function prettyDate(value) {
  return value
    ? new Date(value.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not used yet";
}
function settingsCard(title, subtitle, body) {
  return `<section class="settings-card"><div class="settings-card-heading"><h2>${title}</h2><p>${subtitle}</p></div>${body}</section>`;
}
function currentPassword() {
  return '<label>Current password<input type="password" name="current_password" autocomplete="current-password" required></label>';
}
function saveButton(text = "Save changes") {
  return `<p class="form-error" role="alert"></p><button class="primary small" type="submit">${text}</button>`;
}
async function renderSettings() {
  const container = document.querySelector("#view-content");
  container.innerHTML = '<div class="loading">Loading your settings…</div>';
  const data = await api("settings");
  const a = data.account;
  container.innerHTML = `<div class="settings-intro"><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>Your Hub. Your way.</h2><p>Manage your identity, security, and space.</p><div class="settings-jumps"><a href="#account-settings">Account</a><a href="#security-settings">Security</a><a href="#appearance-settings">Appearance</a></div></div><div class="settings-stack"><div id="account-settings">${settingsCard("Your profile", "Make your identity unmistakably yours.", `<form data-settings-form="profile">${profileFields(a)}${saveButton("Save profile")}</form>`)}${settingsCard("Email address", "Private to you. Never shown on your public profile.", emailPanel(a))}</div><div id="security-settings">${settingsCard("Passkeys", "A faster, safer way into your realm.", `<p class="settings-copy">Sign in with your fingerprint, face, device PIN, or a security key. Your device keeps the private key; the Hub stores only the public credential.</p><div class="passkey-list">${data.passkeys.length ? data.passkeys.map((k) => `<div class="passkey-row"><div class="key-tile">${icon("key")}</div><div><strong>${esc(k.label)}</strong><small>Added ${prettyDate(k.created_at)} · ${k.last_used ? "Last used " + prettyDate(k.last_used) : "Not used yet"}</small></div><button class="text-button danger-text" data-action="remove-passkey" data-id="${k.id}">Remove</button></div>`).join("") : '<div class="subtle-empty">No passkeys yet. Add one to skip your password next time.</div>'}</div><button class="outline" data-action="add-passkey">${icon("key")} Add a passkey</button><p class="field-help">Keep your password as a backup. Passkeys work on supported devices and browsers.</p>`)}${settingsCard("Password", "Change your password and sign out other sessions.", `<form data-settings-form="password-update">${currentPassword()}<label>New password<input name="new_password" type="password" minlength="12" maxlength="72" autocomplete="new-password" required></label><label>Confirm new password<input name="confirm_password" type="password" minlength="12" maxlength="72" autocomplete="new-password" required></label><p class="field-help">12–72 characters. Use a unique password for the Hub.</p>${saveButton("Update password")}</form>`)}</div><div id="appearance-settings">${settingsCard("Appearance", "Preferences are saved to your account across devices.", `<form data-settings-form="preferences"><fieldset><legend>Realm theme</legend><div class="theme-options"><label class="theme-option"><input type="radio" name="theme" value="midnight" ${preferences.theme === "midnight" ? "checked" : ""}><span class="theme-swatch midnight"></span><span>Midnight</span></label><label class="theme-option"><input type="radio" name="theme" value="amethyst" ${preferences.theme === "amethyst" ? "checked" : ""}><span class="theme-swatch amethyst"></span><span>Amethyst</span></label></div></fieldset><label>Feed spacing<select name="density"><option value="comfortable" ${preferences.density === "comfortable" ? "selected" : ""}>Comfortable</option><option value="compact" ${preferences.density === "compact" ? "selected" : ""}>Compact</option></select></label><label class="check-row"><input type="checkbox" name="reduced_motion" ${preferences.reduced_motion ? "checked" : ""}> Reduce animations</label>${saveButton("Save appearance")}</form>`)}</div>${settingsCard("Your data", "Your account belongs to you.", `<div class="setting-row"><p>Download your profile, email, posts, and preferences as a JSON file.</p><button class="outline" data-action="export">Export my data ${icon("arrow")}</button></div><div class="setting-row signout-row"><p>Signed in as <strong>@${esc(a.username)}</strong></p><button class="text-button" data-action="logout">Sign out ${icon("logout")}</button></div>`)}</div>`;
  await enhanceAccountSettings(data);
}
async function saveSettingsForm(form) {
  const submit = form.querySelector('button[type="submit"]'),
    error = form.querySelector(".form-error");
  submit.disabled = true;
  error.textContent = "";
  try {
    const type = form.dataset.settingsForm;
    if (type === "profile") {
      await saveCustomProfile(form);
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    if (
      type === "password-update" &&
      data.new_password !== data.confirm_password
    )
      throw Error("The new passwords do not match.");
    if (type === "passkey-add") {
      await addPasskey(data);
      modal.close();
      await renderSettings();
      toast("Passkey added. You can use it next time you sign in.");
      return;
    }
    if (type === "passkey-remove") {
      await api("passkey-remove", { ...data, id: Number(form.dataset.id) });
      modal.close();
      await renderSettings();
      toast("Passkey removed.");
      return;
    }
    const result = await api(type, data);
    if (type === "preferences") {
      preferences = result.preferences;
      applyPreferences();
    }
    if (type === "profile") {
      me = { ...me, name: data.name, bio: data.bio };
      document.querySelector(".member-mini strong").textContent = me.name;
    }
    form
      .querySelectorAll('input[type="password"]')
      .forEach((i) => (i.value = ""));
    if (type === "account-update") {
      await renderSettings();
      toast(
        result.unchanged
          ? "This email is already verified."
          : "Check your inbox to confirm the address.",
      );
    } else
      toast(
        type === "password-update"
          ? "Password updated. Other sessions have been signed out."
          : "Changes saved to your account.",
      );
  } catch (e) {
    error.textContent = passkeyError(e);
  } finally {
    submit.disabled = false;
  }
}
function decode64(s) {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
}
function encode64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function decodeOptions(options, create = false) {
  const pk = options.publicKey;
  pk.challenge = decode64(pk.challenge);
  if (create) {
    pk.user.id = decode64(pk.user.id);
    pk.excludeCredentials?.forEach((c) => (c.id = decode64(c.id)));
  } else pk.allowCredentials?.forEach((c) => (c.id = decode64(c.id)));
  return options;
}
function passkeyError(e) {
  if (e.name === "NotAllowedError")
    return "Passkey request was cancelled or timed out. You can try again.";
  if (e.name === "InvalidStateError")
    return "This device already has a passkey for your account.";
  if (e.name === "NotSupportedError")
    return "This device does not support the requested passkey. Try another browser or security key.";
  return e.message || "Passkey operation could not be completed.";
}
async function addPasskey(data) {
  if (!window.PublicKeyCredential)
    throw Error("Passkeys are not supported in this browser.");
  const options = decodeOptions(
    await api("passkey-register-options", data),
    true,
  );
  const credential = await navigator.credentials.create(options);
  if (!credential) throw Error("No passkey was created.");
  await api("passkey-register-finish", {
    clientDataJSON: encode64(credential.response.clientDataJSON),
    attestationObject: encode64(credential.response.attestationObject),
  });
}
async function passkeyLogin(button) {
  button.disabled = true;
  try {
    if (!window.PublicKeyCredential)
      throw Error("Passkeys are not supported in this browser.");
    const options = decodeOptions(await api("passkey-login-options", {}));
    const c = await navigator.credentials.get(options);
    if (!c) throw Error("No passkey was selected.");
    await api("passkey-login-finish", {
      id: encode64(c.rawId),
      clientDataJSON: encode64(c.response.clientDataJSON),
      authenticatorData: encode64(c.response.authenticatorData),
      signature: encode64(c.response.signature),
      userHandle: c.response.userHandle ? encode64(c.response.userHandle) : "",
    });
    view = "all";
    await start();
  } catch (e) {
    toast(passkeyError(e));
  } finally {
    button.disabled = false;
  }
}
async function refreshActivity() {
  clearTimeout(activityTimer);
  if (!me) return;
  try {
    const data = await api("notifications");
    document.querySelectorAll(".unread-dot").forEach((el) => {
      el.hidden = !data.unread;
      el.textContent = data.unread > 9 ? "9+" : data.unread;
    });
  } catch {}
  activityTimer = setTimeout(refreshActivity, 60000);
}
async function renderActivity() {
  const data = await api("notifications");
  document.querySelector("#view-content").innerHTML =
    `<div class="activity-intro"><div><span class="eyebrow">YOUR COMMUNITY, CONNECTED</span><h2>What’s happening around you.</h2></div><button class="outline" data-action="mark-read" ${!data.unread ? "disabled" : ""}>Mark all read</button></div><div class="activity-list">${data.items.length ? data.items.map((n) => `<button class="activity-item ${!n.is_read ? "unread" : ""}" data-action="${n.kind === "follow" ? "member" : "notification-post"}" data-id="${n.kind === "follow" ? n.actor_id : n.post_id}">${avatar(n)}<div><p><strong>${esc(n.name)}</strong> ${n.kind === "like" ? "liked your post" : n.kind === "reply" ? "replied to your post" : "started following you"}</p>${n.body ? `<span>${esc(n.body.slice(0, 110))}</span>` : ""}<small>${timeAgo(n.created_at)} ago</small></div><span class="activity-type">${icon(n.kind === "like" ? "like" : n.kind === "reply" ? "reply" : "profile")}</span></button>`).join("") : '<section class="empty-state"><div>✦</div><h2>Your party’s next move, right here.</h2><p>Likes, replies, and new followers will appear as your community grows.</p></section>'}</div>`;
}
async function openPost(id) {
  const [p] = await api("feed", null, { id });
  if (!p) {
    toast("This post is no longer available.");
    return;
  }
  postCache.set(Number(p.id), p);
  await replies(Number(p.id));
  polishIcons();
}
async function openPermalink() {
  const match = location.hash.match(/^#post-(\d+)$/);
  if (match) await openPost(Number(match[1]));
}
async function extraAction(action, button, id) {
  if (await videoAction(action)) return true;
  if (await profileAction(action, button)) return true;
  if (action === "settings" || action === "activity") {
    view = action;
    profileId = null;
    await renderView();
    window.scrollTo({
      top: 0,
      behavior: preferences.reduced_motion ? "instant" : "smooth",
    });
    return true;
  }
  if (action === "passkey-login") {
    await passkeyLogin(button);
    return true;
  }
  if (action === "add-passkey") {
    openModal(
      `<h2>Add a passkey</h2><p class="muted">Confirm your password, then follow your device’s prompt.</p><form data-settings-form="passkey-add"><label>Passkey name<input name="label" placeholder="e.g. My phone" maxlength="40" required></label>${currentPassword()}${saveButton("Continue to device")}</form>`,
    );
    return true;
  }
  if (action === "remove-passkey") {
    openModal(
      `<h2>Remove this passkey?</h2><p class="muted">You can still sign in with your password or another saved passkey.</p><form data-settings-form="passkey-remove" data-id="${id}">${currentPassword()}${saveButton("Remove passkey")}</form>`,
    );
    return true;
  }
  if (action === "export") {
    const data = await api("export");
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "axiomate-hub-" + me.username + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Your data export is ready.");
    return true;
  }
  if (action === "mark-read") {
    await api("notifications-read", {});
    await renderActivity();
    await refreshActivity();
    return true;
  }
  if (action === "notification-post") {
    await openPost(id);
    return true;
  }
  if (action === "refresh") {
    if (view === "settings" || view === "activity") await renderView();
    else await loadFeed();
    await Promise.all([loadMembers(), refreshActivity()]);
    toast("You’re up to date.");
    return true;
  }
  if (action === "confirm-delete") {
    const parent = postCache.get(id)?.parent_id;
    await api("delete", { id });
    postCache.delete(id);
    modal.close();
    if (view === "activity") await renderActivity();
    else if (view !== "settings") await loadFeed();
    if (parent) await openPost(Number(parent));
    toast("Post deleted.");
    return true;
  }
  if (action === "topic") {
    if (view !== "explore") {
      view = "explore";
      await renderView();
    }
    search = button.dataset.topic;
    const input = document.querySelector("#explore-form input");
    if (input) input.value = search;
    await loadFeed();
    return true;
  }
  if (action === "emoji") {
    openModal(
      `<h2>Set the mood.</h2><div class="emoji-grid">${["🎮", "✨", "🔥", "💜", "⚔️", "👑", "🖤", "🚀", "👾", "💀", "🏆", "🫡", "🌑", "🐉", "⚡", "🎯"].map((e) => `<button data-action="insert-emoji" data-emoji="${e}" aria-label="Insert ${e}">${e}</button>`).join("")}</div>`,
    );
    return true;
  }
  if (action === "insert-emoji") {
    const field = document.querySelector("#post-body");
    if (field) {
      const start = field.selectionStart,
        end = field.selectionEnd;
      const value =
        field.value.slice(0, start) +
        button.dataset.emoji +
        field.value.slice(end);
      if (value.length > 500) {
        toast("Your post is at the 500-character limit.");
        return true;
      }
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      modal.close();
      field.focus();
      field.selectionStart = field.selectionEnd =
        start + button.dataset.emoji.length;
    }
    return true;
  }
  if (action === "like" || action === "bookmark") {
    button.disabled = true;
    try {
      const result = await api(action, { id });
      const p = postCache.get(id);
      if (p) {
        if (action === "like") {
          p.liked = Number(result.active);
          p.likes = result.likes;
        } else p.bookmarked = Number(result.active);
      }
      document.querySelectorAll(`.post[data-post="${id}"]`).forEach((el) => {
        const b = el.querySelector(`[data-action="${action}"]`);
        if (!b) return;
        b.classList.toggle(
          action === "like" ? "liked" : "saved",
          result.active,
        );
        b.setAttribute(
          "aria-label",
          action === "like"
            ? result.active
              ? "Unlike post"
              : "Like post"
            : result.active
              ? "Remove bookmark"
              : "Bookmark post",
        );
        b.innerHTML =
          icon(action === "like" ? "like" : "bookmarks") +
          (action === "like" ? `<span>${result.likes || ""}</span>` : "");
        if (
          action === "bookmark" &&
          view === "bookmarks" &&
          !result.active &&
          !el.closest("dialog")
        )
          el.remove();
      });
      if (action === "bookmark")
        toast(result.active ? "Saved to your bookmarks." : "Bookmark removed.");
    } finally {
      button.disabled = false;
    }
    return true;
  }
  if (action === "share") {
    const url = `https://axiomatehub.com/#post-${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Post link copied. Members can open the conversation.");
    } catch {
      openModal(
        `<h2>Share this conversation</h2><label>Post link<input value="${esc(url)}" readonly></label>`,
      );
    }
    return true;
  }
  if (action === "close") {
    activeThread = null;
    return false;
  }
  return false;
}
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    const form = event.target.closest("form");
    if (form && ["post-form", "reply-form"].includes(form.id)) {
      event.preventDefault();
      form.requestSubmit();
    }
  }
});
