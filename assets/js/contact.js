const form = document.querySelector("[data-contact-form]");

if (form) {
  const submitButton = form.querySelector("[data-contact-submit]");
  const status = form.querySelector("[data-contact-status]");
  const emailFallback = form.querySelector("[data-contact-email]");
  const defaultButtonLabel = submitButton?.textContent || "Send";
  const startedAt = performance.now();
  let submitting = false;

  const setStatus = (state = "", message = "") => {
    if (!status) return;
    status.className = `contact-form-status${state ? ` is-${state}` : ""}`;
    status.textContent = message;
  };

  const buildDraftEmailHref = () => {
    const name = String(form.elements.name?.value || "").trim();
    const email = String(form.elements.email?.value || "").trim();
    const message = String(form.elements.message?.value || "").trim();
    const body = [
      "Hi Joe,",
      "",
      message,
      "",
      name ? `Name: ${name}` : "",
      email ? `Reply-to: ${email}` : "",
    ]
      .filter((line, index, lines) => line || index < 4 || lines[index - 1])
      .join("\n")
      .trimEnd();

    return `mailto:joey.wisto@gmail.com?subject=${encodeURIComponent("Portfolio inquiry - Joe Wisto")}&body=${encodeURIComponent(body)}`;
  };

  const syncDraftEmail = () => {
    if (emailFallback) emailFallback.href = buildDraftEmailHref();
  };

  const setSubmitting = (nextSubmitting) => {
    submitting = nextSubmitting;
    form.classList.toggle("is-submitting", nextSubmitting);
    if (submitButton) {
      submitButton.disabled = nextSubmitting;
      submitButton.textContent = nextSubmitting ? "Sending…" : defaultButtonLabel;
    }
  };

  form.addEventListener("input", () => {
    syncDraftEmail();
    if (status?.classList.contains("is-error")) setStatus();
  });

  emailFallback?.addEventListener("click", syncDraftEmail);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;

    setStatus();
    setSubmitting(true);
    syncDraftEmail();

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.elements.name?.value || "").trim(),
          email: String(form.elements.email?.value || "").trim(),
          message: String(form.elements.message?.value || "").trim(),
          companyWebsite: String(form.elements.companyWebsite?.value || "").trim(),
          elapsedMs: Math.max(0, Math.round(performance.now() - startedAt)),
        }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.ok !== true) throw new Error("Contact submission was not accepted.");

      form.reset();
      syncDraftEmail();
      setStatus("success", "Thanks! Your message has been sent. I’ll get back to you shortly.");
    } catch (error) {
      console.error("Portfolio contact submission failed", error);
      syncDraftEmail();
      setStatus("error", "Oops! Something went wrong. Please try again or draft an email instead.");
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  });

  syncDraftEmail();
}
