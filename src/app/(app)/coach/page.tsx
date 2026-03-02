import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Volume - Agent Workspace",
};

export default function CoachPage() {
  redirect("/today");
}
