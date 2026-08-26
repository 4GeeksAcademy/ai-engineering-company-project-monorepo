import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <p>
        <Link href="/suppliers/">Supplier Directory</Link>
      </p>
    </main>
  );
}
