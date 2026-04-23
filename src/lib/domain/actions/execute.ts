import type { ZodIssue } from "zod";
import {
  getDomainActionDefinition,
  type DomainActionAuditCategory,
  type DomainActionDefinition,
  type DomainActionExposure,
  type DomainActionIdempotency,
  type DomainActionName,
  type DomainActionScope,
} from "@/lib/domain/actions/registry";

export type DomainActionAuthProvider =
  | "clerk_session"
  | "clerk_api_key"
  | "first_party_api_key";

export type DomainActionPrincipal = {
  userId: string;
  authProvider: DomainActionAuthProvider;
  scopes: readonly DomainActionScope[];
};

export type DomainActionExecutionRequest<Context> = {
  action: DomainActionDefinition<DomainActionName>;
  principal: DomainActionPrincipal;
  context: Context;
};

export type DomainActionRunner<Context, Result> = (
  args: unknown,
  request: DomainActionExecutionRequest<Context>
) => Promise<Result>;

export type DomainActionRunnerMap<Context, Result> = Partial<
  Record<DomainActionName, DomainActionRunner<Context, Result>>
>;

export type DomainActionAuditOutcome = "success" | "error";

export type DomainActionAuditEvent = {
  actionName: DomainActionName;
  userId: string;
  authProvider: DomainActionAuthProvider;
  scopes: readonly DomainActionScope[];
  auditCategory: DomainActionAuditCategory;
  idempotency: DomainActionIdempotency;
  exposure: DomainActionExposure;
  outcome: DomainActionAuditOutcome;
  errorCode?: DomainActionErrorCode;
  durationMs: number;
  occurredAt: number;
};

export type DomainActionAuditSink = (
  event: DomainActionAuditEvent
) => void | Promise<void>;

export type DomainActionValidationIssue = {
  path: readonly string[];
  message: string;
};

export type DomainActionErrorCode =
  | "unsupported_action"
  | "invalid_action_args"
  | "forbidden"
  | "action_failed";

export class DomainActionError extends Error {
  readonly code: DomainActionErrorCode;
  readonly status: number;
  readonly issues?: readonly DomainActionValidationIssue[];

  constructor({
    code,
    status,
    message,
    issues,
    cause,
  }: {
    code: DomainActionErrorCode;
    status: number;
    message: string;
    issues?: readonly DomainActionValidationIssue[];
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "DomainActionError";
    this.code = code;
    this.status = status;
    this.issues = issues;
  }
}

export type ExecuteDomainActionOptions<Context, Result> = {
  name: string;
  rawArgs: unknown;
  principal: DomainActionPrincipal;
  exposure: DomainActionExposure;
  context: Context;
  runners: DomainActionRunnerMap<Context, Result>;
  audit?: DomainActionAuditSink;
  now?: () => number;
};

function toValidationIssues(
  issues: readonly ZodIssue[]
): DomainActionValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.map((part) => String(part)),
    message: issue.message,
  }));
}

function toDomainActionError(error: unknown): DomainActionError {
  if (error instanceof DomainActionError) {
    return error;
  }

  return new DomainActionError({
    code: "action_failed",
    status: 500,
    message: error instanceof Error ? error.message : "Domain action failed.",
    cause: error,
  });
}

function requireExposure(
  action: DomainActionDefinition<DomainActionName>,
  exposure: DomainActionExposure
) {
  if (action.exposure === exposure) {
    return;
  }

  throw new DomainActionError({
    code: "forbidden",
    status: 403,
    message: `${action.name} is not available to ${exposure} clients.`,
  });
}

function requireScopes(
  action: DomainActionDefinition<DomainActionName>,
  principal: DomainActionPrincipal
) {
  const missingScopes = action.scopes.filter(
    (scope) => !principal.scopes.includes(scope)
  );

  if (missingScopes.length === 0) {
    return;
  }

  throw new DomainActionError({
    code: "forbidden",
    status: 403,
    message: `Missing required scope: ${missingScopes[0]}`,
  });
}

export async function executeDomainAction<Context, Result>({
  name,
  rawArgs,
  principal,
  exposure,
  context,
  runners,
  audit,
  now = Date.now,
}: ExecuteDomainActionOptions<Context, Result>): Promise<Result> {
  const action = getDomainActionDefinition(name);
  if (!action) {
    throw new DomainActionError({
      code: "unsupported_action",
      status: 404,
      message: `${name} is not a domain action.`,
    });
  }

  const startedAt = now();
  let outcome: DomainActionAuditOutcome = "error";
  let errorCode: DomainActionErrorCode | undefined;

  try {
    requireExposure(action, exposure);
    requireScopes(action, principal);

    const parsedArgs = action.inputSchema.safeParse(rawArgs);
    if (!parsedArgs.success) {
      throw new DomainActionError({
        code: "invalid_action_args",
        status: 400,
        message:
          parsedArgs.error.issues[0]?.message ?? "Invalid action arguments.",
        issues: toValidationIssues(parsedArgs.error.issues),
      });
    }

    const runner = runners[action.name];
    if (!runner) {
      throw new DomainActionError({
        code: "unsupported_action",
        status: 404,
        message: `${action.name} has no registered runner.`,
      });
    }

    const result = await runner(parsedArgs.data, {
      action,
      principal,
      context,
    });
    outcome = "success";
    return result;
  } catch (error) {
    const domainError = toDomainActionError(error);
    errorCode = domainError.code;
    throw domainError;
  } finally {
    await audit?.({
      actionName: action.name,
      userId: principal.userId,
      authProvider: principal.authProvider,
      scopes: action.scopes,
      auditCategory: action.auditCategory,
      idempotency: action.idempotency,
      exposure: action.exposure,
      outcome,
      errorCode,
      durationMs: Math.max(0, now() - startedAt),
      occurredAt: now(),
    });
  }
}
