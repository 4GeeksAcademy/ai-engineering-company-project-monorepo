"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Locations", href: "/locations", icon: "📍" },
  { name: "Orders", href: "/orders", icon: "📋" },
  { name: "Incidents", href: "/incidents", icon: "🚨" },
  { name: "Brasa Points", href: "/loyalty", icon: "⭐" },
  { name: "Hiring", href: "/hiring", icon: "👥" },
  { name: "Suppliers", href: "/suppliers", icon: "🤝" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-full w-64 flex-col border-r border-gray-200 bg-brasa-brown text-white">
      {/* Logo */}
      <div className="border-b border-white/10 p-6">
        <h1 className="font-oswald text-2xl font-bold uppercase tracking-wide">
          Brasaland
        </h1>
        <p className="mt-1 text-xs text-gray-400 uppercase tracking-widest">
          Backoffice
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brasa-red text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brasa-red text-sm font-bold">
            MP
          </div>
          <div>
            <p className="text-sm font-medium">Mariana Park</p>
            <p className="text-xs text-gray-400">Operations Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
