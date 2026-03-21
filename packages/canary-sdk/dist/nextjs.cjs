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
var import_index = require("./index.cjs");

// src/nextjs.ts
async function onRequestError(error, request, opts) {
  await (0, import_index.captureException)(error, {
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
