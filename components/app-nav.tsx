"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/today", label: "Today" },
  { href: "/foods", label: "Foods" },
  { href: "/meals", label: "Meals" },
  { href: "/weight", label: "Weight" },
  { href: "/settings", label: "Settings" }
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-5 gap-1 text-center text-xs font-medium text-ink/60">
      {links.map((link) => (
        <Link
          className={[
            "rounded-md px-2 py-3",
            pathname === link.href
              ? "bg-gradient-to-r from-mint via-aqua to-lilac text-ink shadow-sm"
              : ""
          ].join(" ")}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
