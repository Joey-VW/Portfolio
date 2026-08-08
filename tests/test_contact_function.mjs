import assert from "node:assert/strict";
import { onRequest } from "../functions/api/contact.js";

const originalFetch = globalThis.fetch;

function makeRequest(payload, method = "POST") {
  return new Request("https://example.com/api/contact", {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(payload) : undefined,
  });
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

try {
  let fetchCalls = 0;
  let submittedBody = "";

  globalThis.fetch = async (_url, options) => {
    fetchCalls += 1;
    submittedBody = String(options?.body || "");
    return new Response("ok", { status: 200 });
  };

  const success = await onRequest({
    request: makeRequest({
      name: "Jo Example",
      email: "jo@example.com",
      message: "Hello from the portfolio.",
      companyWebsite: "",
      elapsedMs: 1_500,
    }),
  });

  assert.equal(success.status, 200);
  assert.deepEqual(await readJson(success), { ok: true });
  assert.equal(fetchCalls, 1);
  const forwarded = new URLSearchParams(submittedBody);
  assert.equal(forwarded.get("entry.583825424"), "Jo Example");
  assert.equal(forwarded.get("entry.1916707778"), "jo@example.com");
  assert.equal(forwarded.get("entry.1501178020"), "Hello from the portfolio.");

  fetchCalls = 0;
  const invalid = await onRequest({
    request: makeRequest({
      name: "Jo Example",
      email: "not-an-email",
      message: "Hello",
      companyWebsite: "",
      elapsedMs: 1_500,
    }),
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(await readJson(invalid), { ok: false });
  assert.equal(fetchCalls, 0);

  const tooFast = await onRequest({
    request: makeRequest({
      name: "Jo Example",
      email: "jo@example.com",
      message: "Hello",
      companyWebsite: "",
      elapsedMs: 100,
    }),
  });
  assert.equal(tooFast.status, 400);
  assert.equal(fetchCalls, 0);

  const honeypot = await onRequest({
    request: makeRequest({
      name: "Bot",
      email: "bot@example.com",
      message: "Spam",
      companyWebsite: "https://spam.example",
      elapsedMs: 1_500,
    }),
  });
  assert.equal(honeypot.status, 200);
  assert.deepEqual(await readJson(honeypot), { ok: true });
  assert.equal(fetchCalls, 0);

  globalThis.fetch = async () => new Response("nope", { status: 500 });
  const upstreamFailure = await onRequest({
    request: makeRequest({
      name: "Jo Example",
      email: "jo@example.com",
      message: "Hello",
      companyWebsite: "",
      elapsedMs: 1_500,
    }),
  });
  assert.equal(upstreamFailure.status, 502);
  assert.deepEqual(await readJson(upstreamFailure), { ok: false });

  const wrongMethod = await onRequest({
    request: makeRequest({}, "GET"),
  });
  assert.equal(wrongMethod.status, 405);

  console.log("Contact function tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
