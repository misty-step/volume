import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/today?prompt=show%20settings%20overview");
}
