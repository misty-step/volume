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
export {
  onRequestError
};
