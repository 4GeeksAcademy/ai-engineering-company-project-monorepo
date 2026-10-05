import Link from "next/link";
import { FileBarChart, List, Plus } from "lucide-react";
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
          Register incidents, review the list, and read totals across the clinic network.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Incident manager</CardTitle>
          <CardDescription>Log an incident or review the ones already registered.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/incidents/register" className={cn(buttonVariants({ size: "lg" }), "w-fit")}>
            <Plus data-icon="inline-start" />
            Register incident
          </Link>
          <Link href="/incidents/board" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-fit")}>
            <List data-icon="inline-start" />
            Open incident list
          </Link>
        </CardContent>
      </Card>
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
