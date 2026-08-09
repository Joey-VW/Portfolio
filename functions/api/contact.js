const GOOGLE_FORM_SUBMIT_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeZ0r2oO3N2lJMgkydQQcotphWVQqjvqtJOt6KKgVzq1He8aA/formResponse";

const ENTRY_IDS = {
  name: "entry.583825424",
  email: "entry.1916707778",
  message: "entry.1501178020",
};

const MAX_REQUEST_BYTES = 16_384;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 5_000;
const MIN_FILL_TIME_MS = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validate(payload) {
  const name = clean(payload?.name);
  const email = clean(payload?.email);
  const message = clean(payload?.message);
  const companyWebsite = clean(payload?.companyWebsite);
  const elapsedMs = Number(payload?.elapsedMs);

  if (companyWebsite) return { spam: true };

  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_FILL_TIME_MS) {
    return { error: "Submission was completed too quickly." };
  }

  if (!name || name.length > MAX_NAME_LENGTH) {
    return { error: "Name is required and must be 100 characters or fewer." };
  }

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { error: "A valid email address is required." };
  }

  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return { error: "Message is required and must be 5000 characters or fewer." };
  }

  return { values: { name, email, message } };
}

export async function onRequest({ request }) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false }, 405);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse({ ok: false }, 415);
  }

  let payload;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ ok: false }, 413);
    }
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false }, 400);
  }

  const validation = validate(payload);

  // Quietly accept honeypot submissions without polluting the response sheet.
  if (validation.spam) return jsonResponse({ ok: true });
  if (validation.error) return jsonResponse({ ok: false }, 400);

  const body = new URLSearchParams({
    [ENTRY_IDS.name]: validation.values.name,
    [ENTRY_IDS.email]: validation.values.email,
    [ENTRY_IDS.message]: validation.values.message,
  });

  try {
    const upstream = await fetch(GOOGLE_FORM_SUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: body.toString(),
      redirect: "follow",
    });

    // Reading the body ensures the upstream response completes before we report success.
    await upstream.arrayBuffer();

    if (!upstream.ok) {
      console.error("Portfolio contact upstream rejected submission", {
        status: upstream.status,
      });
      return jsonResponse({ ok: false }, 502);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Portfolio contact upstream request failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ ok: false }, 502);
  }
}
