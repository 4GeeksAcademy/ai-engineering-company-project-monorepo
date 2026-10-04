import Link from "next/link";
import { Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Operations overview</h2>
        <p className="mt-2 text-muted-foreground">
          Clinic and technology vendor registry for HealthCore Digital.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Supplier directory</CardTitle>
          <CardDescription>
            Register vendors, filter by country or category, and update monthly rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/suppliers"
            className={cn(buttonVariants({ size: "lg" }), "w-fit")}
          >
            <Truck data-icon="inline-start" />
            Open supplier directory
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
