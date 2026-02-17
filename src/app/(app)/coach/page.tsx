import type { Metadata } from "next";
import { CoachPrototype } from "@/components/coach/CoachPrototype";

export const metadata: Metadata = {
  title: "Volume – Coach Prototype",
};

export default function CoachPage() {
  return <CoachPrototype />;
}
