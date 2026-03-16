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

// src/nextjs.ts
var nextjs_exports = {};
__export(nextjs_exports, {
  onRequestError: () => onRequestError
});
module.exports = __toCommonJS(nextjs_exports);

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

// src/nextjs.ts
async function onRequestError(error, request, opts) {
  await captureException(error, {
    ...opts,
    context: {
      ...opts?.context,
      path: request.path,
      method: request.method
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  onRequestError
});
