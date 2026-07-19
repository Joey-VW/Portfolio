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

function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const { isValid } = validateForm(form);
  if (!isValid) return;
  setFormState(form, "error", SITE_CONFIG.ask.disabledMessage);
}

function renderCustomForm() {
  const disabledMessage = escapeHtml(SITE_CONFIG.ask.disabledMessage);

  container.innerHTML = `
    <form class="ask-note-form" novalidate>
      <div class="ask-form-intro">
        <p class="panel-kicker">Interactive form preview</p>
        <h2>Send a postcard</h2>
        <p>Try the validation and form states. No submitted data is collected or sent from this demo.</p>
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
        <p class="ask-form-escape">${disabledMessage}</p>
      </div>
      <p class="ask-form-status" data-ask-status role="status" aria-live="polite"></p>
    </form>
  `;

  const form = container.querySelector("form");
  form?.addEventListener("submit", handleSubmit);
}

function renderAsk() {
  if (!container) return;
  renderCustomForm();
}

renderAsk();
