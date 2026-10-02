'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Package,
  ScanLine,
  ArrowDownToLine,
  FlaskConical,
  Calculator,
  History,
  Database,
  Layers,
  MapPin,
  Settings,
  ChevronDown,
  Menu,
  X,
  Home,
  MoreHorizontal,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  highlight?: boolean;
}

const primaryNav: NavItem[] = [
  { href: '/', label: 'หน้าหลัก', icon: Home },
  { href: '/inventory', label: 'คลังสินค้า', icon: Package },
  { href: '/scan', label: 'AI สแกน', icon: ScanLine, highlight: true },
  { href: '/inbound', label: 'รับเข้า', icon: ArrowDownToLine },
  { href: '/production', label: 'เบิกผลิต', icon: Calculator },
];

const secondaryNav: NavItem[] = [
  { href: '/recipes', label: 'สูตรการผลิต (BOM)', icon: FlaskConical },
  { href: '/sections', label: 'โซนคลัง', icon: MapPin },
  { href: '/transactions', label: 'ประวัติรับ-จ่าย', icon: History },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings },
];

const mobileNav: NavItem[] = [
  { href: '/', label: 'หน้าหลัก', icon: Home },
  { href: '/inventory', label: 'คลัง', icon: Package },
  { href: '/scan', label: 'AI สแกน', icon: ScanLine, highlight: true },
  { href: '/inbound', label: 'รับเข้า', icon: ArrowDownToLine },
  { href: '/transactions', label: 'ประวัติ', icon: History },
];

export default function Navbar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200 font-bold text-sm">
              B
            </div>
            <Link href="/" className="font-bold text-slate-900 hover:text-blue-600 transition text-sm leading-tight">
              <span className="hidden sm:block">BMP Raw Materials</span>
              <span className="block sm:hidden">BMP MRP</span>
            </Link>
          </div>

          {/* Desktop Primary Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    item.highlight
                      ? active
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                      : active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* More dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  secondaryNav.some((i) => isActive(i.href))
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MoreHorizontal className="w-4 h-4" />
                <span>เพิ่มเติม</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20">
                    {secondaryNav.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                            active
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Right: DB button + mobile menu */}
          <div className="flex items-center gap-2">
            <a
              href="http://localhost:5555"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 transition shadow-sm"
              title="เปิด Prisma Studio — ดูและแก้ไขข้อมูล Database โดยตรง"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">DB Studio</span>
            </a>
            <span className="hidden lg:inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              SQLite
            </span>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile full menu (hamburger open) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-0.5">
            {[...primaryNav, ...secondaryNav].map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    item.highlight
                      ? active
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700'
                      : active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
            <a
              href="http://localhost:5555"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Database className="w-4 h-4 shrink-0 text-emerald-500" />
              เปิด Database Studio (Prisma)
            </a>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 no-print">
        <div className="flex items-stretch h-16">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  item.highlight
                    ? active
                      ? 'text-purple-700 bg-purple-50'
                      : 'text-purple-600'
                    : active
                    ? 'text-blue-700 bg-blue-50'
                    : 'text-slate-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
