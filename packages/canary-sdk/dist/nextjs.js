import {
  captureException
} from "./index.js";

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
