const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav-links");
const themeToggle = document.querySelector(".theme-toggle");

menuToggle?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute(
    "aria-label",
    `Switch to ${isDark ? "light" : "dark"} mode`,
  );
  themeToggle.querySelector("[aria-hidden]").textContent = isDark ? "☀" : "☾";
  themeToggle.querySelector(".theme-toggle-label").textContent = isDark
    ? "Light mode"
    : "Dark mode";
}

applyTheme(localStorage.getItem("avanty-theme") || "light");

themeToggle.addEventListener("click", () => {
  const nextTheme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("avanty-theme", nextTheme);
  applyTheme(nextTheme);
});

const lightbox = document.querySelector(".lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxCaption = document.querySelector(".lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");
let lastGalleryTrigger;

function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
  lastGalleryTrigger?.focus();
}

document.querySelectorAll(".gallery-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const image = trigger.querySelector("img");
    const caption = trigger.querySelector("figcaption");
    lastGalleryTrigger = trigger;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = caption.textContent;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    lightboxClose.focus();
  });
});

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
    closeLightbox();
  }
});

const reviewForm = document.querySelector("#review-form");
const reviewsList = document.querySelector("#reviews-list");
const reviewStatus = document.querySelector("#review-status");
const averageRating = document.querySelector("#average-rating");
const reviewCount = document.querySelector("#review-count");
const ratingBreakdown = document.querySelector("#rating-breakdown");

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

function renderReviews(reviews) {
  reviewsList.replaceChildren();
  if (!reviews.length) {
    const empty = document.createElement("p");
    empty.className = "reviews-empty";
    empty.textContent = "No reviews yet. Share your experience with Avanty.";
    reviewsList.append(empty);
    averageRating.textContent = "—";
    reviewCount.textContent = "Not decided yet — no reviews.";
    ratingBreakdown.replaceChildren();
    const emptyBreakdown = document.createElement("p");
    emptyBreakdown.className = "rating-sentiment";
    emptyBreakdown.textContent = "No customer ratings yet.";
    ratingBreakdown.append(emptyBreakdown);
    return;
  }

  const average =
    reviews.reduce((total, review) => total + review.rating, 0) /
    reviews.length;
  const distribution = [1, 2, 3, 4, 5].map(
    (rating) => reviews.filter((review) => review.rating === rating).length,
  );
  const highRatingShare = (distribution[3] + distribution[4]) / reviews.length;
  const lowRatingShare = (distribution[0] + distribution[1]) / reviews.length;
  const sentiment =
    highRatingShare >= 0.8 && average >= 4.4
      ? "Overwhelmingly positive"
      : lowRatingShare >= 0.35 || average < 3
        ? "Needs improvement"
        : "Mixed customer feedback";
  averageRating.textContent = average.toFixed(1);
  reviewCount.textContent = `${sentiment} · ${reviews.length} customer ${reviews.length === 1 ? "review" : "reviews"}`;
  ratingBreakdown.replaceChildren();
  [5, 4, 3, 2, 1].forEach((rating) => {
    const count = distribution[rating - 1];
    const row = document.createElement("div");
    row.className = "rating-row";
    const label = document.createElement("span");
    label.textContent = `${rating} star`;
    const track = document.createElement("div");
    track.className = "rating-track";
    const fill = document.createElement("span");
    fill.style.width = `${(count / reviews.length) * 100}%`;
    track.append(fill);
    const total = document.createElement("strong");
    total.textContent = String(count);
    row.append(label, track, total);
    ratingBreakdown.append(row);
  });

  reviews.forEach((review) => {
    const card = document.createElement("article");
    card.className = "review-card";
    const heading = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = review.name;
    const stars = document.createElement("span");
    stars.className = "review-stars";
    stars.setAttribute("aria-label", `${review.rating} out of 5 stars`);
    stars.textContent =
      "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
    heading.append(name, stars);
    const text = document.createElement("p");
    text.textContent = review.review;
    const service = document.createElement("span");
    service.className = "review-service";
    service.textContent = review.service;
    const date = document.createElement("time");
    date.dateTime = review.created_at;
    date.textContent = formatDate(review.created_at);
    const replies = document.createElement("div");
    replies.className = "review-replies";
    (review.replies || []).forEach((reply) => {
      const replyCard = document.createElement("div");
      replyCard.className = "review-reply";
      const replyAuthor = document.createElement("strong");
      replyAuthor.textContent = reply.name;
      const replyText = document.createElement("p");
      replyText.textContent = reply.reply;
      const replyDate = document.createElement("time");
      replyDate.dateTime = reply.created_at;
      replyDate.textContent = formatDate(reply.created_at);
      replyCard.append(replyAuthor, replyText, replyDate);
      replies.append(replyCard);
    });
    const replyDetails = document.createElement("details");
    replyDetails.className = "reply-form";
    const replySummary = document.createElement("summary");
    replySummary.textContent = "Reply to this review";
    const replyForm = document.createElement("form");
    replyForm.dataset.reviewId = review.id;
    replyForm.innerHTML = `<label>First name<input name="name" type="text" minlength="2" maxlength="50" autocomplete="given-name" required></label><label>Email address <span>Private</span><input name="email" type="email" maxlength="254" autocomplete="email" required></label><label>Your reply<textarea name="reply" rows="3" minlength="2" maxlength="800" required></textarea></label><label class="website-field" aria-hidden="true">Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label><button type="submit">Post reply</button><p class="reply-status" role="status" aria-live="polite"></p>`;
    replyForm.addEventListener("submit", submitReply);
    replyDetails.append(replySummary, replyForm);
    card.append(heading, text, service, date, replies, replyDetails);
    reviewsList.append(card);
  });
}

async function loadReviews() {
  try {
    const response = await fetch("reviews.php", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Unable to load reviews.");
    const data = await response.json();
    renderReviews(data.reviews || []);
  } catch {
    reviewsList.textContent =
      "Reviews are temporarily unavailable. Please check back soon.";
  }
}

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = reviewForm.querySelector('button[type="submit"]');
  const formData = new FormData(reviewForm);
  const payload = Object.fromEntries(formData.entries());
  submitButton.disabled = true;
  reviewStatus.textContent = "Publishing your review…";

  try {
    const response = await fetch("reviews.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Unable to publish your review.");
    reviewForm.reset();
    reviewStatus.textContent = "Thank you—your review is now live.";
    await loadReviews();
  } catch (error) {
    reviewStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

async function submitReply(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector(".reply-status");
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.action = "reply";
  payload.review_id = form.dataset.reviewId;
  button.disabled = true;
  status.textContent = "Posting reply…";
  try {
    const response = await fetch("reviews.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Unable to post your reply.");
    await loadReviews();
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
}

loadReviews();

const callModal = document.querySelector(".call-modal");
const callModalClose = document.querySelector(".call-modal-close");
const callModalTrigger = document.querySelector(".call-modal-trigger");

function closeCallModal() {
  callModal.classList.remove("is-open");
  callModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("call-modal-open");
  callModalTrigger.focus();
}

callModalTrigger.addEventListener("click", () => {
  callModal.classList.add("is-open");
  callModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("call-modal-open");
  callModalClose.focus();
});
callModalClose.addEventListener("click", closeCallModal);
callModal.addEventListener("click", (event) => {
  if (event.target === callModal) {
    closeCallModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && callModal.classList.contains("is-open")) {
    closeCallModal();
  }
});
