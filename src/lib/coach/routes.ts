export const COACH_HOME_PATH = "/coach";
export const DASHBOARD_PATH = "/today";

export function buildCoachPromptPath(prompt: string): string {
  return `${COACH_HOME_PATH}?prompt=${encodeURIComponent(prompt)}`;
}
