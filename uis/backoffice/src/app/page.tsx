import Link from "next/link";
import { FileBarChart } from "lucide-react";
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
        <p className="mt-2 text-muted-foreground">Incident file analysis</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Incident file analyzer</CardTitle>
          <CardDescription>Upload CSV, view summary, export results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            href="/incidents"
            className={cn(buttonVariants({ size: "lg" }), "w-fit")}
          >
            <FileBarChart data-icon="inline-start" />
            Open incident analyzer
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
