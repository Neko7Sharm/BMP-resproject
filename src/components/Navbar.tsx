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
  User,
  LogOut,
  Users,
  LogIn,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
  { href: '/db-studio', label: 'DB Studio (จัดการฐานข้อมูล)', icon: Database },
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { user, isAdmin, roleConfig, logout, canAccessRoute } = useAuth();

  const isDbStudio = pathname === '/db-studio';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  // Extend secondary nav with Admin Users management if admin
  const allSecondaryNav = [
    ...(isAdmin ? [{ href: '/settings/users', label: 'จัดการผู้ใช้ (Accounts)', icon: Users }] : []),
    ...secondaryNav,
  ];

  // Filter menus based on user role permissions
  const visiblePrimaryNav = primaryNav.filter(item => canAccessRoute(item.href));
  const visibleSecondaryNav = allSecondaryNav.filter(item => canAccessRoute(item.href));
  const visibleMobileNav = mobileNav.filter(item => canAccessRoute(item.href));

  return (
    <header className={`${
      isDbStudio
        ? 'bg-slate-950 border-b border-slate-800 text-slate-100'
        : 'bg-white border-b border-slate-200 text-slate-900'
    } sticky top-0 z-50 shadow-sm no-print transition-colors duration-200`}>
      <div className={`${isDbStudio ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200 font-bold text-sm">
              K
            </div>
            <Link
              href="/"
              className={`font-bold transition text-sm leading-tight ${
                isDbStudio ? 'text-white hover:text-blue-400' : 'text-slate-900 hover:text-blue-600'
              }`}
            >
              <span className="hidden sm:block">KMP Raw Materials</span>
              <span className="block sm:hidden">KMP MRP</span>
            </Link>
          </div>

          {/* Desktop Primary Nav (Filtered by role) */}
          <nav className="hidden md:flex items-center gap-0.5">
            {visiblePrimaryNav.map((item) => {
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
                        : isDbStudio
                        ? 'bg-purple-950/80 text-purple-300 hover:bg-purple-900/60 border border-purple-800'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                      : active
                      ? isDbStudio
                        ? 'bg-slate-800 text-blue-400 font-semibold'
                        : 'bg-blue-50 text-blue-700 font-semibold'
                      : isDbStudio
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* More dropdown (Filtered by role) */}
            {visibleSecondaryNav.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    visibleSecondaryNav.some((i) => isActive(i.href))
                      ? isDbStudio
                        ? 'bg-slate-800 text-blue-400 font-semibold'
                        : 'bg-blue-50 text-blue-700 font-semibold'
                      : isDbStudio
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900'
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
                    <div className={`absolute right-0 top-full mt-1 w-56 rounded-xl shadow-xl border py-1.5 z-20 ${
                      isDbStudio
                        ? 'bg-slate-900 border-slate-800 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      {visibleSecondaryNav.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                              active
                                ? isDbStudio
                                  ? 'bg-slate-800 text-blue-400 font-semibold'
                                  : 'bg-blue-50 text-blue-700 font-semibold'
                                : isDbStudio
                                ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isDbStudio ? 'text-slate-400' : 'text-slate-500'}`} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </nav>

          {/* Right: User Profile + DB Studio (Admin only) + mobile menu */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/db-studio"
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                  isDbStudio
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400/40 shadow-blue-500/30'
                    : 'bg-slate-800 text-white hover:bg-slate-900'
                }`}
                title="DB Studio — จัดการฐานข้อมูลและ Audit Logs (สิทธิ์แอดมิน)"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>DB Studio</span>
              </Link>
            )}

            {/* User Profile Pill & Dropdown (When logged in) / Login Button (When guest) */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border transition text-xs ${
                    isDbStudio
                      ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-xs">{roleConfig?.icon || '👤'}</span>
                  <span className="hidden sm:inline font-bold truncate max-w-[100px]">{user.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${roleConfig?.badgeClass || 'bg-slate-200'}`}>
                    {roleConfig?.shortLabel || user.role}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setUserDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl shadow-xl border border-slate-200 bg-white py-2 z-30 text-slate-700">
                      <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <div className="text-xs font-bold text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
                        <div className="mt-1 text-[10px] text-slate-500 leading-tight">{roleConfig?.desc}</div>
                      </div>
                      {isAdmin && (
                        <Link
                          href="/settings/users"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition"
                        >
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                          จัดการผู้ใช้ (Accounts)
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        ออกจากระบบ (Logout)
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`md:hidden p-2 rounded-lg transition ${
                isDbStudio
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile full menu (hamburger open) */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-t shadow-lg ${
          isDbStudio
            ? 'bg-slate-950 border-slate-800 text-slate-200'
            : 'bg-white border-slate-100 text-slate-700'
        }`}>
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {/* Mobile User Info / Guest Banner */}
            {user ? (
              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl mb-2 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{roleConfig?.icon}</span>
                    <span className="text-xs font-bold text-slate-900">{user.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${roleConfig?.badgeClass}`}>
                      {roleConfig?.shortLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">@{user.username}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100/50 rounded-lg flex items-center gap-1 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออก
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">โหมดดูข้อมูลทั่วไป (Guest)</div>
                  <div className="text-[10px] text-slate-500">เข้าสู่ระบบเพื่อแก้ไขหรือจัดการสต็อก</div>
                </div>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  เข้าสู่ระบบ
                </Link>
              </div>
            )}

            {[...visiblePrimaryNav, ...visibleSecondaryNav].map((item) => {
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
                        : isDbStudio
                        ? 'bg-purple-950 text-purple-300'
                        : 'bg-purple-50 text-purple-700'
                      : active
                      ? isDbStudio
                        ? 'bg-slate-800 text-blue-400 font-semibold'
                        : 'bg-blue-50 text-blue-700 font-semibold'
                      : isDbStudio
                      ? 'text-slate-300 hover:bg-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile bottom nav (Filtered by role) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.07)] z-50 no-print">
        <div className="flex items-stretch h-16 max-w-md mx-auto px-1">
          {visibleMobileNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all relative ${
                  item.highlight
                    ? active
                      ? 'text-purple-700 font-bold'
                      : 'text-purple-600'
                    : active
                    ? 'text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {active && (
                  <span className={`absolute top-1 w-6 h-1 rounded-full ${
                    item.highlight ? 'bg-purple-600' : 'bg-blue-600'
                  }`} />
                )}
                <div className={`p-1 rounded-xl transition-transform ${
                  active
                    ? item.highlight
                      ? 'bg-purple-100/80 scale-105'
                      : 'bg-blue-100/80 scale-105'
                    : ''
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
