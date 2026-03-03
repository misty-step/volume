import { redirect } from "next/navigation";

export default function HistoryPage() {
  redirect("/today?prompt=show%20history%20overview");
}
