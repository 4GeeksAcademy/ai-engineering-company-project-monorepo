import { redirect } from "next/navigation";

// /inventory has no content of its own: the section starts at the stock page.
export default function InventoryIndex() {
  redirect("/inventory/products");
}
