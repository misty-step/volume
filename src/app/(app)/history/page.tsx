import { redirect } from "next/navigation";

export default function HistoryPage() {
  redirect("/coach?prompt=show%20history%20overview");
}
