"use server";

import { redirect } from "next/navigation";
import { findAccount, loadCustomers } from "@/lib/api";

export async function lookupCustomer(formData: FormData) {
  const query = String(formData.get("query") ?? "").trim();
  if (!query) {
    redirect("/points?error=empty");
  }
  const loaded = await loadCustomers();
  const account = findAccount(loaded.data, query);
  if (!account) {
    redirect("/points?error=not-found");
  }
  redirect(`/points/${account.id}`);
}
