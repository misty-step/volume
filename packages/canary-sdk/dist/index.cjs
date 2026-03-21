"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  captureException: () => captureException,
  captureMessage: () => captureMessage,
  initCanary: () => initCanary
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
function createClient(opts) {
  const endpoint = opts.endpoint.replace(/\/$/, "");
  const url = `${endpoint}/api/v1/errors`;
  const maxQueue = opts.maxQueue ?? 10;
  let inflight = 0;
  async function send(payload) {
    if (inflight >= maxQueue) return null;
    inflight++;
    const body = JSON.stringify({
      service: opts.service,
      environment: opts.environment ?? "production",
      ...payload
    });
    try {
      return await attempt(url, opts.apiKey, body, 1);
    } catch {
      return null;
    } finally {
      inflight--;
    }
  }
  return {
    send,
    get pending() {
      return inflight;
    }
  };
}
async function attempt(url, apiKey, body, retries) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body,
      signal: AbortSignal.timeout(2e3)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    if (retries > 0) return attempt(url, apiKey, body, retries - 1);
    throw err;
  }
}

// src/scrub.ts
var EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
function scrub(input, custom) {
  if (input === void 0) return void 0;
  let result = input.replace(EMAIL, "[EMAIL]");
  if (custom) {
    for (const rule of custom) {
      result = result.replace(rule.pattern, rule.replacement);
    }
  }
  return result;
}
function scrubObject(value, custom) {
  if (typeof value === "string") return scrub(value, custom);
  if (Array.isArray(value)) return value.map((v) => scrubObject(v, custom));
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = scrubObject(v, custom);
    }
    return out;
  }
  return value;
}

// src/index.ts
var client = null;
var scrubPii = false;
var scrubRules = [];
function initCanary(opts) {
  client = createClient(opts);
  scrubPii = opts.scrubPii ?? false;
  scrubRules = opts.scrubRules ?? [];
}
async function captureException(error, opts = {}) {
  if (!client) return null;
  const { errorClass, message, stackTrace } = normalizeError(error);
  return client.send({
    error_class: errorClass,
    message: scrubPii ? scrub(message, scrubRules) : message,
    severity: opts.severity ?? "error",
    stack_trace: scrubPii ? scrub(stackTrace, scrubRules) : stackTrace,
    context: scrubPii ? scrubObject(opts.context, scrubRules) : opts.context,
    fingerprint: opts.fingerprint
  });
}
async function captureMessage(message, opts = {}) {
  if (!client) return null;
  return client.send({
    error_class: "Message",
    message: scrubPii ? scrub(message, scrubRules) : message,
    severity: opts.severity ?? "info",
    context: scrubPii ? scrubObject(opts.context, scrubRules) : opts.context,
    fingerprint: opts.fingerprint
  });
}
function normalizeError(error) {
  if (error instanceof Error) {
    return {
      errorClass: error.constructor.name || "Error",
      message: error.message,
      stackTrace: error.stack
    };
  }
  if (typeof error === "string") {
    return { errorClass: "StringError", message: error, stackTrace: void 0 };
  }
  return {
    errorClass: "UnknownError",
    message: String(error),
    stackTrace: void 0
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  captureException,
  captureMessage,
  initCanary
});
