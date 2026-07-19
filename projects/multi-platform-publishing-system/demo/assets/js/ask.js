import { SITE_CONFIG } from "./config.js";
import { escapeHtml } from "./content.js";

const container = document.getElementById("askFormContainer");
const directLink = document.getElementById("askDirectLink");
const fallbackEmail = document.getElementById("askFallbackEmail");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(form, fieldName, message = "") {
  const field = form.elements[fieldName];
  const error = form.querySelector(`[data-error-for="${fieldName}"]`);
  if (!field || !error) return;

  field.setAttribute("aria-invalid", message ? "true" : "false");
  error.textContent = message;
}

function validateForm(form) {
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();
  let isValid = true;

  setFieldError(form, "name");
  setFieldError(form, "email");
  setFieldError(form, "message");

  if (!name) {
    setFieldError(form, "name", "Please add your name.");
    isValid = false;
  }

  if (!email) {
    setFieldError(form, "email", "Please add your email address.");
    isValid = false;
  } else if (!emailPattern.test(email)) {
    setFieldError(form, "email", "Please use a valid email address.");
    isValid = false;
  }

  if (!message) {
    setFieldError(form, "message", "Please write a short message.");
    isValid = false;
  }

  return { isValid, values: { name, email, message } };
}

function setFormState(form, state, message = "") {
  const submitButton = form.querySelector("button[type='submit']");
  const status = form.querySelector("[data-ask-status]");
  const isSubmitting = state === "submitting";

  form.classList.toggle("is-submitting", isSubmitting);
  [...form.elements].forEach((element) => {
    element.disabled = isSubmitting;
  });

  if (submitButton) {
    submitButton.textContent = isSubmitting ? "Sending…" : "Send note";
  }

  if (status) {
    status.className = `ask-form-status${state ? ` is-${state}` : ""}`;
    status.textContent = message;
  }
}

function buildGooglePayload(entryIds, values) {
  const payload = new FormData();
  payload.set(entryIds.name, values.name);
  payload.set(entryIds.email, values.email);
  payload.set(entryIds.message, values.message);
  return payload;
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const { enabled, googleFormSubmitUrl, googleFormViewUrl, entries } = SITE_CONFIG.ask;
  const { isValid, values } = validateForm(form);

  if (!isValid) return;

  if (!enabled) {
    setFormState(form, "error", "Submissions are paused in this portfolio demo. No message was submitted or collected.");
    return;
  }

  if (!googleFormSubmitUrl || !entries?.name || !entries?.email || !entries?.message) {
    setFormState(form, "error", "The note form is taking a quick detour. Please use the backup link below.");
    return;
  }

  setFormState(form, "submitting", "Sending your note…");

  try {
    await fetch(googleFormSubmitUrl, {
      method: "POST",
      mode: "no-cors",
      body: buildGooglePayload(entries, values),
    });

    form.reset();
    setFormState(form, "success", "Your message has been sent.");
  } catch (error) {
    console.error("Ask form submission failed", error);
    const fallback = googleFormViewUrl ? " You can still send your note using the backup link below." : " Please try again in a moment.";
    setFormState(form, "error", `We could not send the note from this page.${fallback}`);
  }
}

function renderCustomForm() {
  const { googleFormViewUrl } = SITE_CONFIG.ask;
  const fallbackLink = googleFormViewUrl
    ? `<a href="${escapeHtml(googleFormViewUrl)}" target="_blank" rel="noopener">try this form</a>`
    : "try again in a moment";

  container.innerHTML = `
    <form class="ask-note-form" novalidate>
      <div class="ask-form-intro">
        <p class="panel-kicker">Interactive form preview</p>
        <h2>Send a postcard</h2>
        <p>Try the validation and form states. Delivery is intentionally paused, and this preview submits and collects no messages.</p>
      </div>
      <label class="ask-field">
        <span>Name</span>
        <input name="name" type="text" autocomplete="name" placeholder="Your name" aria-describedby="ask-name-error" required />
        <small id="ask-name-error" class="field-error" data-error-for="name"></small>
      </label>
      <label class="ask-field">
        <span>Email</span>
        <input name="email" type="email" autocomplete="email" placeholder="you@example.com" aria-describedby="ask-email-error" required />
        <small id="ask-email-error" class="field-error" data-error-for="email"></small>
      </label>
      <label class="ask-field">
        <span>Message</span>
        <textarea name="message" rows="7" placeholder="Write a quick hello…" aria-describedby="ask-message-error" required></textarea>
        <small id="ask-message-error" class="field-error" data-error-for="message"></small>
      </label>
      <div class="ask-form-footer">
        <button class="button" type="submit">Send note</button>
        <p class="ask-form-escape">Having trouble? ${fallbackLink}.</p>
      </div>
      <p class="ask-form-status" data-ask-status role="status" aria-live="polite"></p>
    </form>
  `;

  const form = container.querySelector("form");
  form?.addEventListener("submit", handleSubmit);
}

function renderAsk() {
  if (!container) return;
  const { googleFormViewUrl, googleFormEmbedUrl, contactEmail, emailSubject } = SITE_CONFIG.ask;

  renderCustomForm();

  const publicFormUrl = googleFormViewUrl || googleFormEmbedUrl?.replace("?embedded=true", "") || "";
  if (directLink && publicFormUrl) {
    directLink.href = publicFormUrl;
    directLink.hidden = false;
  }

  if (fallbackEmail && contactEmail) {
    const mailto = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(emailSubject || "Postcard Atlas demo question")}`;
    fallbackEmail.href = mailto;
    fallbackEmail.hidden = false;
  }
}

renderAsk();
