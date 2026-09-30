import type { Metadata } from "next";
import { ApplicationPage } from "@/components/application-page";

export const metadata: Metadata = {
  title: "HealthCore | Request an appointment",
  description: "Request an appointment with HealthCore. Our front desk team will contact you within one business day.",
};

export default function Application() {
  return <ApplicationPage />;
}
