let accountDetails = null,
  profileEdits = {};
function imageURL(value) {
  return typeof value === "string" &&
    /^api\.php\?action=profile-image&user=\d+&kind=(avatar|banner)&v=[a-f0-9]+$/.test(
      value,
    )
    ? value
    : "";
}
function renderAvatar(person, cls = "") {
  const p = typeof person === "object" && person ? person : { name: person };
  const url = imageURL(p.avatar_url);
  const accent = ["violet", "cyan", "rose", "amber"].includes(p.accent)
    ? p.accent
    : "violet";
  return `<span class="avatar ${cls}" data-accent="${accent}">${url ? `<img src="${esc(url)}" alt="" loading="lazy">` : esc((p.name || "A").slice(0, 1).toUpperCase())}</span>`;
}
function profileCover(p, preview = false) {
  const url = imageURL(p.banner_url);
  return `<div class="profile-cover custom-cover" data-cover="${esc(p.cover || "shadow")}">${url ? `<img src="${esc(url)}" alt="Profile cover" class="cover-image">` : ""}<div class="cover-shade"></div><span>${esc(p.tagline || "ARISE TOGETHER.")}</span><b>✦</b></div>`;
}
function profileExtras(p) {
  return `<div class="profile-meta">${p.pronouns ? `<span>${esc(p.pronouns)}</span>` : ""}${p.location ? `<span>⌖ ${esc(p.location)}</span>` : ""}${p.favorite_game ? `<span>🎮 ${esc(p.favorite_game)}</span>` : ""}${p.website ? `<a href="${esc(p.website)}" target="_blank" rel="noopener noreferrer">↗ ${esc(p.website.replace(/^https?:\/\//, ""))}</a>` : ""}</div>`;
}
function profileFields(p) {
  return `<div class="profile-editor" data-accent="${esc(p.accent || "violet")}"><div class="profile-preview">${profileCover(p, true)}<div class="preview-person">${avatar(p, "large")}<div><strong data-preview-name>${esc(p.name)}</strong><small>@${esc(p.username)}</small></div></div></div><div class="image-controls"><label class="outline file-control">Change avatar<input type="file" name="avatar_file" accept="image/jpeg,image/png,image/webp" data-profile-image="avatar"></label><label class="outline file-control">Change cover<input type="file" name="banner_file" accept="image/jpeg,image/png,image/webp" data-profile-image="banner"></label><button type="button" class="text-button" data-action="clear-profile-image" data-kind="avatar">Remove avatar</button><button type="button" class="text-button" data-action="clear-profile-image" data-kind="banner">Remove cover</button></div><p class="field-help">JPEG, PNG, or WebP · up to 8 MB. Images are fitted to your profile. Changes apply when you save.</p><label>Display name<input name="name" value="${esc(p.name)}" maxlength="40" required></label><label>Tagline<input name="tagline" value="${esc(p.tagline || "")}" maxlength="60" placeholder="Your next chapter starts here."></label><label>Bio<textarea name="bio" maxlength="160" placeholder="Tell your party a little about yourself.">${esc(p.bio)}</textarea></label><div class="profile-field-grid"><label>Pronouns<input name="pronouns" value="${esc(p.pronouns || "")}" maxlength="30" placeholder="Optional"></label><label>Location<input name="location" value="${esc(p.location || "")}" maxlength="60" placeholder="Your corner of the world"></label></div><label>Website<input type="url" name="website" value="${esc(p.website || "")}" maxlength="200" placeholder="https://your-site.com"></label><label>Favorite game<input name="favorite_game" value="${esc(p.favorite_game || "")}" maxlength="60" placeholder="What are you playing?"></label><fieldset><legend>Profile accent</legend><div class="accent-options">${["violet", "cyan", "rose", "amber"].map((c) => `<label data-accent="${c}"><input type="radio" name="accent" value="${c}" ${p.accent === c || (!p.accent && c === "violet") ? "checked" : ""}><span>${c[0].toUpperCase() + c.slice(1)}</span></label>`).join("")}</div></fieldset><label>Cover style<select name="cover">${[
    ["shadow", "Shadow realm"],
    ["eclipse", "Violet eclipse"],
    ["frost", "Frozen gates"],
    ["ember", "Ember sky"],
  ]
    .map(
      ([v, n]) =>
        `<option value="${v}" ${p.cover === v ? "selected" : ""}>${n}</option>`,
    )
    .join(
      "",
    )}</select></label><p class="field-help">These profile details are visible to other signed-in members.</p></div>`;
}
function emailPanel(a) {
  return `<div class="email-status ${a.email_verified ? "verified" : "unverified"}"><span>${a.email_verified ? "✓ Email verified" : "◇ Verify your email"}</span><p>${a.email_verified ? "Your email ownership is confirmed." : "Confirm your email so we know it belongs to you."}</p></div>${a.pending_email ? `<div class="pending-email"><strong>Check ${esc(a.pending_email)}</strong><p>Confirm the link there to change your address. Your current email stays active until then.</p><button type="button" class="text-button" data-action="verification-send">Resend link</button><button type="button" class="text-button" data-action="verification-cancel">Cancel email change</button></div>` : !a.email_verified ? '<button type="button" class="outline" data-action="verification-send">Send verification email</button>' : ""}<form data-settings-form="account-update"><label>Current email<input type="email" value="${esc(a.email)}" readonly></label><label>${a.email_verified ? "New email address" : "Email address"}<input type="email" name="email" value="${esc(a.email)}" autocomplete="email" required></label>${currentPassword()}<p class="field-help">We’ll send a confirmation link. A new address becomes active only after verification.</p>${saveButton("Send confirmation link")}</form>`;
}
async function enhanceAccountSettings(data) {
  accountDetails = data.account;
  profileEdits = {};
}
async function saveCustomProfile(form) {
  const error = form.querySelector(".form-error");
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  error.textContent = "";
  try {
    const data = Object.fromEntries(new FormData(form));
    delete data.avatar_file;
    delete data.banner_file;
    let result = await api("profile", data);
    me = { ...me, ...result.profile };
    for (const kind of ["avatar", "banner"]) {
      const edit = profileEdits[kind];
      if (edit !== undefined) {
        const image = await api(
          "profile-image",
          edit === null ? { kind, remove: true } : { kind, data: edit },
        );
        me[kind + "_url"] = image.url;
      }
    }
    profileEdits = {};
    postCache.clear();
    modal.close();
    await shell();
    toast("Your profile is ready for the party.");
  } catch (e) {
    error.textContent = e.message;
  } finally {
    button.disabled = false;
  }
}
async function resizeProfileImage(file, kind) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > 8 * 1024 * 1024)
    throw Error("Choose an image smaller than 8 MB.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width < 16 || bitmap.height < 16) {
    bitmap.close();
    throw Error("Choose an image at least 16 pixels wide and tall.");
  }
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  if (kind === "avatar") {
    canvas.width = canvas.height = 512;
    const size = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(
      bitmap,
      (bitmap.width - size) / 2,
      (bitmap.height - size) / 2,
      size,
      size,
      0,
      0,
      512,
      512,
    );
  } else {
    canvas.width = 1600;
    canvas.height = 550;
    const ratio = Math.max(1600 / bitmap.width, 550 / bitmap.height),
      w = bitmap.width * ratio,
      h = bitmap.height * ratio;
    ctx.drawImage(bitmap, (1600 - w) / 2, (550 - h) / 2, w, h);
  }
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
async function profileAction(action, button) {
  if (action === "edit-profile") {
    profileEdits = {};
    const p = (await api("settings")).account;
    openModal(
      `<h2>Make this realm yours.</h2><form data-settings-form="profile">${profileFields(p)}${saveButton("Save profile")}</form>`,
    );
    return true;
  }
  if (action === "clear-profile-image") {
    const kind = button.dataset.kind;
    profileEdits[kind] = null;
    const editor = button.closest("form").querySelector(".profile-editor");
    if (kind === "avatar") {
      const preview = editor.querySelector(".avatar");
      preview.innerHTML = esc(me.name.slice(0, 1).toUpperCase());
    } else editor.querySelector(".cover-image")?.remove();
    return true;
  }
  if (action === "verification-send") {
    button.disabled = true;
    try {
      await api("verification-send", {});
      toast("Verification email sent. Check your inbox and spam folder.");
      if (view === "settings") await renderSettings();
    } catch (e) {
      toast(e.message);
    } finally {
      button.disabled = false;
    }
    return true;
  }
  if (action === "verification-cancel") {
    await api("verification-cancel", {});
    await renderSettings();
    toast("Pending email change cancelled.");
    return true;
  }
  if (action === "verification-confirm") {
    button.disabled = true;
    try {
      await api("verification-confirm", { token: verificationToken });
      verificationToken = "";
      history.replaceState(null, "", location.pathname + location.search);
      modal.close();
      if (me) {
        if (view === "settings") await renderSettings();
        else await showVerificationBanner();
      }
      toast("Email verified. You’re all set.");
    } catch (e) {
      const message = modal.querySelector(".form-error");
      if (message) message.textContent = e.message;
      else toast(e.message);
    } finally {
      button.disabled = false;
    }
    return true;
  }
  return false;
}
let verificationToken = "";
function openVerificationLink() {
  const match = location.hash.match(/^#verify-email=([a-f0-9]{64})$/);
  if (!match) return;
  verificationToken = match[1];
  openModal(
    `<div class="verification-art">◇</div><h2>Confirm your email.</h2><p class="muted">This confirms the address linked in your verification email. Your link can be used once and expires after one hour.</p><p class="form-error" role="alert"></p><button class="primary verify-confirm" data-action="verification-confirm">Confirm email</button>`,
  );
}
async function showVerificationBanner() {
  document.querySelector(".verification-banner")?.remove();
  if (!me) return;
  const data = await api("settings");
  accountDetails = data.account;
  if (!accountDetails.email_verified) {
    const main = document.querySelector(".feed-main");
    const banner = document.createElement("div");
    banner.className = "verification-banner";
    banner.innerHTML =
      '<span>◇</span><div><strong>One more step: verify your email.</strong><p>Confirm your address to complete your account.</p></div><button class="text-button" data-action="settings">Review email</button>';
    main?.querySelector(".main-header")?.after(banner);
  }
}
document.addEventListener("change", async (event) => {
  const input = event.target;
  if (!input.dataset.profileImage) return;
  const file = input.files?.[0];
  if (!file) return;
  const form = input.closest("form");
  const error = form.querySelector(".form-error");
  const save = form.querySelector('button[type="submit"]');
  save.disabled = true;
  error.textContent = "";
  try {
    const kind = input.dataset.profileImage;
    const data = await resizeProfileImage(file, kind);
    profileEdits[kind] = data;
    const preview = form.querySelector(".profile-preview");
    if (kind === "avatar")
      preview.querySelector(".avatar").innerHTML =
        `<img src="${data}" alt="Selected avatar preview">`;
    else {
      preview.querySelector(".cover-image")?.remove();
      const img = document.createElement("img");
      img.src = data;
      img.className = "cover-image";
      img.alt = "Selected cover preview";
      preview.querySelector(".profile-cover").prepend(img);
    }
  } catch (e) {
    error.textContent = e.message;
  } finally {
    save.disabled = false;
  }
});
document.addEventListener("input", (event) => {
  const field = event.target;
  const editor = field.closest(".profile-editor");
  if (!editor) return;
  if (field.name === "name")
    editor.querySelector("[data-preview-name]").textContent =
      field.value || "Your name";
  if (field.name === "tagline")
    editor.querySelector(".profile-cover>span").textContent =
      field.value || "ARISE TOGETHER.";
  if (field.name === "cover")
    editor.querySelector(".profile-cover").dataset.cover = field.value;
  if (field.name === "accent") {
    editor.dataset.accent = field.value;
    editor.querySelector(".avatar").dataset.accent = field.value;
  }
});
