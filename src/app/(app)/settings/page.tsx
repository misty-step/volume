import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/coach?prompt=show%20settings%20overview");
}
