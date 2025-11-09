import * as Sentry from "@sentry/nextjs";

import { createSentryOptions } from "./src/lib/sentry";

const options = createSentryOptions("client");

Sentry.init(options);
