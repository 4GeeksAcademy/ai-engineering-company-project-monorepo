import { redirect } from "next/navigation";

export default function MisspelledProfilePage() {
  redirect("/account/profile");
}