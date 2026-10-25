let selectedVideo = null,
  selectedVideoURL = "",
  videoUpload = null;
const VIDEO_LIMIT = 50 * 1024 * 1024;
function videoTools() {
  return `<label class="video-picker" title="Attach a video"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="12" height="14" rx="2"/><path d="m15 10 6-4v12l-6-4"/></svg><span class="sr-only">Attach a video</span><input type="file" id="video-file" accept="video/mp4,video/webm,.mp4,.webm" aria-label="Attach a video"></label>`;
}
function videoAttachment(p) {
  if (!p.video || !/^api\.php\?action=video&id=\d+$/.test(p.video.url))
    return "";
  return `<div class="post-video"><video controls playsinline preload="metadata" aria-label="Video posted by ${esc(p.name)}" src="${esc(p.video.url)}"></video><span class="video-caption">${(p.video.bytes / 1048576).toFixed(1)} MB · ${p.video.mime === "video/webm" ? "WebM" : "MP4"}</span></div>`;
}
function renderVideoSelection() {
  const slot = document.querySelector("#video-attachment");
  const field = document.querySelector("#post-body");
  if (field) field.required = !selectedVideo;
  if (!slot) return;
  slot.innerHTML = selectedVideo
    ? `<div class="video-draft"><video controls playsinline preload="metadata" src="${selectedVideoURL}" aria-label="Attached video preview"></video><div class="video-draft-info"><div><strong>${esc(selectedVideo.name)}</strong><small>${(selectedVideo.size / 1048576).toFixed(1)} MB · Ready to post</small></div><button type="button" class="text-button" data-action="remove-video">Remove</button></div></div>`
    : "";
}
function clearVideo() {
  if (selectedVideoURL) URL.revokeObjectURL(selectedVideoURL);
  selectedVideo = null;
  selectedVideoURL = "";
  renderVideoSelection();
  const input = document.querySelector("#video-file");
  if (input) input.value = "";
}
async function chooseVideo(file) {
  if (file.size > VIDEO_LIMIT)
    throw Error("Choose a video smaller than 50 MB.");
  if (!/\.(mp4|webm)$/i.test(file.name) || !file.size)
    throw Error("Choose an MP4 or WebM video.");
  const url = URL.createObjectURL(file),
    probe = document.createElement("video");
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            Error(
              "This video could not be previewed. Try exporting it as an MP4 with H.264 video.",
            ),
          ),
        15000,
      );
      probe.onloadedmetadata = () => {
        clearTimeout(timer);
        if (!probe.videoWidth || !probe.videoHeight)
          reject(Error("Choose a video with a playable video track."));
        else resolve();
      };
      probe.onerror = () => {
        clearTimeout(timer);
        reject(
          Error(
            "Your browser cannot play this video. Try an MP4 with H.264 video.",
          ),
        );
      };
      probe.preload = "metadata";
      probe.src = url;
    });
    if (selectedVideoURL) URL.revokeObjectURL(selectedVideoURL);
    selectedVideo = file;
    selectedVideoURL = url;
    renderVideoSelection();
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  } finally {
    probe.removeAttribute("src");
    probe.load();
  }
}
function videoProgress(percent, label) {
  const el = document.querySelector("#video-upload-status");
  if (!el) return;
  el.hidden = false;
  el.innerHTML = `<div class="upload-status"><span>${esc(label)}</span><button type="button" class="text-button" data-action="cancel-video-upload">Cancel</button></div><progress value="${percent}" max="100" aria-label="Video upload progress"></progress>`;
}
async function publishPost(data) {
  if (!selectedVideo) return api("post", data);
  const body = new FormData();
  body.append("body", data.body || "");
  body.append("video", selectedVideo);
  const input = document.querySelector("#video-file");
  if (input) input.disabled = true;
  videoProgress(0, "Uploading video… 0%");
  try {
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      videoUpload = xhr;
      xhr.open("POST", "api.php?action=video-post");
      xhr.setRequestHeader("X-CSRF-Token", csrf);
      xhr.timeout = 10 * 60 * 1000;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(
            100,
            Math.round((event.loaded / event.total) * 100),
          );
          videoProgress(
            percent,
            percent === 100
              ? "Finishing your post…"
              : `Uploading video… ${percent}%`,
          );
        }
      };
      xhr.onload = () => {
        let result;
        try {
          result = JSON.parse(xhr.responseText);
        } catch {
          reject(
            Error(
              "The upload could not be completed. The server may have rejected the file size.",
            ),
          );
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(result);
        else
          reject(
            Error(result.error || "Video upload failed. Please try again."),
          );
      };
      xhr.onerror = () =>
        reject(
          Error(
            "The connection was interrupted. Your video is still selected; please try again.",
          ),
        );
      xhr.ontimeout = () =>
        reject(
          Error(
            "The upload timed out. Try a smaller video or a faster connection.",
          ),
        );
      xhr.onabort = () =>
        reject(Error("Upload cancelled. Your video is still selected."));
      xhr.send(body);
    });
    clearVideo();
    return result;
  } finally {
    videoUpload = null;
    if (input) input.disabled = false;
    const status = document.querySelector("#video-upload-status");
    if (status) {
      status.hidden = true;
      status.innerHTML = "";
    }
  }
}
async function videoAction(action) {
  if (action === "cancel-video-upload") {
    videoUpload?.abort();
    return true;
  }
  if (
    videoUpload &&
    [
      "home",
      "explore",
      "profile",
      "member",
      "settings",
      "activity",
      "bookmarks",
      "logout",
      "tab-all",
      "tab-following",
      "refresh",
      "compose",
      "remove-video",
    ].includes(action)
  ) {
    toast(
      "Your video is uploading. Finish or cancel the upload before leaving.",
    );
    return true;
  }
  if (action === "remove-video") {
    clearVideo();
    return true;
  }
  if (action === "logout") {
    clearVideo();
    return false;
  }
  return false;
}
document.addEventListener("change", async (event) => {
  if (event.target.id !== "video-file") return;
  const input = event.target,
    file = input.files?.[0];
  if (!file) return;
  const submit = document.querySelector('#post-form button[type="submit"]');
  const error = document.querySelector("#post-form .form-error");
  if (submit) submit.disabled = true;
  if (error) error.textContent = "";
  try {
    await chooseVideo(file);
  } catch (e) {
    if (error) error.textContent = e.message;
    input.value = "";
  } finally {
    if (submit) submit.disabled = false;
  }
});
document.addEventListener(
  "play",
  (event) => {
    if (event.target instanceof HTMLVideoElement)
      document.querySelectorAll("video").forEach((v) => {
        if (v !== event.target) v.pause();
      });
  },
  true,
);
window.addEventListener("beforeunload", (event) => {
  if (videoUpload) {
    event.preventDefault();
    event.returnValue = "";
  }
});
