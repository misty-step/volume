import { redirect } from "next/navigation";

export default function AnalyticsPage() {
  redirect("/coach?prompt=show%20analytics%20overview");
}
