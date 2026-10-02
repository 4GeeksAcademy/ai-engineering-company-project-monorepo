"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Flame,
  Gauge,
  Handshake,
  LogOut,
  Mail,
  MapPin,
  Star,
  TriangleAlert,
  Users,
} from "lucide-react";
import { logout } from "@/lib/authenticated-fetch";
import {
  getCurrentAccount,
  PROFILE_UPDATED_EVENT,
  type Profile,
} from "@/lib/profile";

interface SidebarAccount {
  email: string;
  profile: Profile;
}

function getInitials(name: string, email: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (initials || email[0] || "?").toUpperCase();
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Gauge },
  { name: "Locations", href: "/locations", icon: MapPin },
  { name: "Orders", href: "/orders", icon: ClipboardList },
  { name: "Incidents", href: "/incidents", icon: TriangleAlert },
  { name: "Brasa Points", href: "/loyalty", icon: Star },
  { name: "Hiring", href: "/hiring", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Handshake },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [account, setAccount] = useState<SidebarAccount | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadAccount = () => {
      getCurrentAccount()
        .then((currentAccount) => {
          if (isActive) setAccount(currentAccount);
        })
        .catch(() => undefined);
    };

    loadAccount();
    window.addEventListener(PROFILE_UPDATED_EVENT, loadAccount);

    return () => {
      isActive = false;
      window.removeEventListener(PROFILE_UPDATED_EVENT, loadAccount);
    };
  }, []);

  const displayName = account?.profile.name?.trim() || account?.email || "Account";
  const email = account?.email ?? "Loading...";
  const initials = getInitials(account?.profile.name?.trim() ?? "", account?.email ?? "");

  return (
    <aside
      aria-label="Primary navigation"
      className="fixed inset-y-0 left-0 z-30 flex w-[168px] flex-col border-r border-gray-200 bg-white text-gray-500 shadow-sm"
    >
      <div className="flex h-16 items-center border-b border-gray-100 px-4 sm:h-[72px]">
        <Link
          href="/dashboard"
          aria-label="Brasaland dashboard"
          title="Brasaland"
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brasa-red text-white shadow-sm transition-colors hover:bg-brasa-red-dark">
            <Flame aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </span>
          <span className="text-sm font-bold text-gray-900">Brasaland</span>
        </Link>
      </div>

      <nav className="flex-1 py-3 sm:py-4">
        <ul className="flex flex-col gap-1.5 px-2.5">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={item.name}
                  className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-red-50 text-brasa-red"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-5 shrink-0"
                    strokeWidth={2}
                  />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-100">
        <Link
          href="/account/profile"
          title="View account profile"
          aria-label={`View profile for ${displayName}`}
          className="flex items-center gap-2.5 px-4 py-3 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brasa-red"
        >
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brasa-brown text-xs font-semibold text-white"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-gray-900">{displayName}</p>
            <p className="flex items-center gap-1 text-[11px] text-gray-500">
              <Mail aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{email}</span>
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-10 w-full items-center gap-3 px-5 py-2 text-xs font-medium text-gray-500 outline-none transition-colors hover:bg-red-50 hover:text-brasa-red focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brasa-red"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
