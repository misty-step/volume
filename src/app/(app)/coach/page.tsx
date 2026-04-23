import type { Metadata } from "next";
import { CoachPrototype } from "@/components/coach/CoachPrototype";

export const metadata: Metadata = {
  title: "Volume - Agent Workspace",
};

export default function CoachPage() {
  return <CoachPrototype />;
}
