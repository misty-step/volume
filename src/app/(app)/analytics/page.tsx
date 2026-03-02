import { redirect } from "next/navigation";

export default function AnalyticsPage() {
  redirect("/today?prompt=show%20analytics%20overview");
}
