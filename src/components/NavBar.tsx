"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/journal', label: 'Journal' },
  { href: '/companion', label: 'Companion' },
  { href: '/integrations', label: 'Integrations' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-[#FDFCF8]/95 backdrop-blur-sm border-b border-[#E4E4E7] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <span className="text-lg font-serif font-semibold text-[#27272A] tracking-tight">MindSpace.</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label }) => {
                const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-[#27272A] text-white font-medium'
                        : 'text-[#71717A] hover:text-[#27272A] hover:bg-[#F4F4F5]'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#D97757] flex items-center justify-center text-white text-xs font-serif font-semibold cursor-pointer">
              S
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
