'use client';

// ── SKILLS APPLIED ────────────────────────────────────────────────────────────
// clean-code:    Meaningful names, small focused components, SRP, no side effects
// ui-ux-designer: Design tokens, accessibility (ARIA), micro-animations, dark mode
// ai-engineer:   AI features surfaced in nav, Gemini branding badge

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard, BookOpen, Calendar, FileText,
  MessageSquare, BarChart2, Settings, X, Crown,
  Sparkles, GraduationCap, LucideIcon
} from 'lucide-react';

import styles from './Sidebar.module.css';

// ── ui-ux-designer: Token-based nav item definitions ─────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard',    href: '/dashboard',   icon: LayoutDashboard, aiPowered: false },
      { name: 'Subjects',     href: '/subjects',    icon: BookOpen,        aiPowered: false },
      { name: 'Timetable',    href: '/timetable',   icon: Calendar,        aiPowered: true  },
      { name: 'Exams',        href: '/exams',       icon: FileText,        aiPowered: false },
      { name: 'Materials',    href: '/materials',   icon: FileText,        aiPowered: false },
    ],
  },
  {
    label: 'AI Features',
    items: [
      // ai-engineer: AI features get their own section for discoverability
      { name: 'AI Tutor',     href: '/chat',        icon: MessageSquare,   aiPowered: true  },
      { name: 'Performance',  href: '/performance', icon: BarChart2,       aiPowered: true  },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Settings',     href: '/settings',    icon: Settings,        aiPowered: false },
    ],
  },
];

// ── clean-code: Extract NavLink into its own SRP component ───────────────────
interface NavLinkProps {
  name: string;
  href: string;
  icon: LucideIcon;
  aiPowered: boolean;
  isActive: boolean;
  onNavigate: () => void;
}

function NavLink({ name, href, icon: Icon, aiPowered, isActive, onNavigate }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}  // ui-ux-designer: WCAG 2.1 ARIA
      className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
    >
      <Icon size={17} className={styles.navIcon} />
      <span className={styles.navText}>
        {name}
      </span>
      {/* ai-engineer: Visual badge marking AI-powered routes */}
      {aiPowered && (
        <span className={styles.aiBadge}>
          <Sparkles size={8} />AI
        </span>
      )}
      {/* ui-ux-designer: Active indicator bar */}
      {isActive && (
        <div className={styles.activeIndicator} />
      )}
    </Link>
  );
}

// ── User Profile footer — ai-engineer: shows premium/free tier ───────────────
function UserProfileFooter() {
  const user = useAuthStore((s) => s.user);
  const isPremium = useAuthStore((s) => s.isPremium);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={styles.userProfile}>
      {/* Avatar */}
      {user?.photoUrl ? (
        <Image src={user.photoUrl} alt={user.name || 'User'} width={40} height={40} className={styles.avatarImg} />
      ) : (
        <div className={styles.avatarFallback}>
          {initials}
        </div>
      )}

      <div className={styles.userInfo}>
        <p className={styles.userName}>
          {user?.name || 'Student'}
        </p>
        {/* ai-engineer: tier badge — premium unlocks more AI features */}
        <span className={`${styles.tierBadge} ${isPremium ? styles.tierPremium : styles.tierFree}`}>
          {isPremium ? <Crown size={10} /> : null}
          {isPremium ? 'Premium' : 'Free Plan'}
        </span>
      </div>

      <Link href="/settings" title="Settings">
        <Settings size={15} className={styles.settingsIcon} />
      </Link>
    </div>
  );
}

// ── Main Sidebar component ───────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, isMounted, setSidebarOpen, setMounted } = useUIStore();
  const [isLocalMounted, setIsLocalMounted] = React.useState(false);

  React.useEffect(() => {
    setIsLocalMounted(true);
    setMounted();
  }, [setMounted]);

  const handleNavigate = () => setSidebarOpen(false);

  const isRouteActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* ui-ux-designer: Backdrop with blur for mobile */}
      {isSidebarOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          className={`${styles.backdrop} lg:hidden`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed} lg:static lg:translate-x-0 lg:transform-none`}
      >
        {/* Logo */}
        <div className={styles.logoBox}>
          <Link href="/dashboard" className={styles.logoLink}>
            <div className={styles.logoIconBox}>
              <GraduationCap size={16} className={styles.logoIcon} />
            </div>
            <span className={styles.logoText}>
              StudyPlanner
            </span>
          </Link>

          <button
            aria-label="Close navigation"
            className={`${styles.closeBtn} lg:hidden`}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav Sections */}
        <nav className={styles.navArea}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className={styles.navSection}>
              <p className={styles.navSectionLabel}>
                {section.label}
              </p>
              <div className={styles.navItemList}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.name}
                    {...item}
                    isActive={isRouteActive(item.href)}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <UserProfileFooter />
      </aside>
    </>
  );
}
