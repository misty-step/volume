const DEFAULT_BASE_REFS = ["origin/master", "master"] as const;

export function selectAffectedBaseRef(
  availableRefs: readonly string[]
): string | null {
  return DEFAULT_BASE_REFS.find((ref) => availableRefs.includes(ref)) ?? null;
}

export function buildAffectedVitestArgs({
  changedFiles,
  baseRef,
}: {
  changedFiles: readonly string[];
  baseRef: string | null;
}): string[] {
  if (changedFiles.length > 0) {
    return ["related", "--run", ...changedFiles];
  }

  if (baseRef) {
    return ["run", "--changed", baseRef];
  }

  throw new Error(
    "Unable to resolve affected test scope. Pass changed files explicitly or fetch master."
  );
}
