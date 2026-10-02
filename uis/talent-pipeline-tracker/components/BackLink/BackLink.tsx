import Link from "next/link";

export interface BackLinkProps {
  href: string;
  children?: React.ReactNode;
}

export default function BackLink({ href, children = "Back" }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
    >
      ← {children}
    </Link>
  );
}