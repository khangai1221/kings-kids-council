import {
  LayoutDashboard,
  Users,
  FileText,
  Vote,
  CheckSquare,
  Trophy,
  ClipboardList,
  CalendarDays,
  Lightbulb,
  Megaphone,
  HelpCircle,
  Bell,
  UserCircle,
  Settings,
  ShieldCheck,
  KeySquare,
  FileEdit,
  ClipboardCheck,
  BarChart3,
  History,
  SlidersHorizontal,
} from "lucide-react";
import type { Capability } from "@/lib/permissions/capabilities";

// NavItem is constructed in Server Components (app/(portal)/layout.tsx,
// app/admin/layout.tsx) and passed as a prop into client nav components.
// React Server Components cannot serialize function references across that
// boundary, so `icon` is a lookup key here — only the client components
// (SidebarNav, MobileBottomNav, CommandMenu) resolve it via NAV_ICONS.
export const NAV_ICONS = {
  LayoutDashboard,
  Users,
  FileText,
  Vote,
  CheckSquare,
  Trophy,
  ClipboardList,
  CalendarDays,
  Lightbulb,
  Megaphone,
  HelpCircle,
  Bell,
  UserCircle,
  Settings,
  ShieldCheck,
  KeySquare,
  FileEdit,
  ClipboardCheck,
  BarChart3,
  History,
  SlidersHorizontal,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconName;
  /** Only relevant for admin nav items; omit for items every admin-tier user can see. */
  capability?: Capability;
  /** Visual grouping label for the sidebar (admin nav only, currently). Consecutive items sharing a section render under one divider. */
  section?: string;
}

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Council", href: "/council", icon: "Users" },
  { label: "Council Applications", href: "/applications", icon: "FileText" },
  { label: "Polls", href: "/polls", icon: "CheckSquare" },
  { label: "Research", href: "/surveys", icon: "ClipboardList" },
  { label: "Events", href: "/events", icon: "CalendarDays" },
  { label: "Competitions", href: "/competitions", icon: "Trophy" },
  { label: "Suggestions", href: "/suggestions", icon: "Lightbulb" },
  { label: "Updates", href: "/announcements", icon: "Megaphone" },
  { label: "Help & Support", href: "/faq", icon: "HelpCircle" },
  { label: "Notifications", href: "/notifications", icon: "Bell" },
  { label: "Profile", href: "/profile", icon: "UserCircle" },
  { label: "Settings", href: "/settings", icon: "Settings" },
];

/** The 3 route-based mobile bottom-tab destinations; a raised center button and a trailing "Menu" trigger fill out the other 2 slots (see MobileBottomNav). */
export const MOBILE_PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Calendar", href: "/events", icon: "CalendarDays" },
  { label: "Notifications", href: "/notifications", icon: "Bell" },
];

/** Shortcuts surfaced in the mobile bottom-nav's raised "+" quick-actions sheet. */
export const STUDENT_QUICK_ACTIONS: NavItem[] = [
  { label: "Apply for Council", href: "/applications", icon: "FileText" },
  { label: "Vote in a Poll", href: "/polls", icon: "CheckSquare" },
  { label: "Submit a Suggestion", href: "/suggestions/new", icon: "Lightbulb" },
  { label: "Browse Competitions", href: "/competitions", icon: "Trophy" },
];

export const ADMIN_QUICK_ACTIONS: NavItem[] = [
  { label: "Create Announcement", href: "/admin/announcements", icon: "Megaphone" },
  { label: "Create Event", href: "/admin/events", icon: "CalendarDays" },
  { label: "Create Poll", href: "/admin/polls", icon: "CheckSquare" },
  { label: "Review Applications", href: "/admin/reviews", icon: "ClipboardCheck" },
  { label: "Manage Users", href: "/admin/users", icon: "Users" },
  { label: "Manage Competitions", href: "/admin/competitions", icon: "Trophy" },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard", section: "Overview" },

  { label: "Users", href: "/admin/users", icon: "Users", capability: "users.manage", section: "People" },
  { label: "Roles", href: "/admin/roles", icon: "KeySquare", capability: "roles.manage", section: "People" },
  { label: "Council", href: "/admin/council", icon: "ShieldCheck", capability: "council.manage", section: "People" },

  { label: "Applications", href: "/admin/applications", icon: "FileText", capability: "applications.manage", section: "Programs" },
  { label: "Forms", href: "/admin/forms", icon: "FileEdit", capability: "forms.manage", section: "Programs" },
  { label: "Reviews", href: "/admin/reviews", icon: "ClipboardCheck", capability: "reviews.manage", section: "Programs" },
  { label: "Polls", href: "/admin/polls", icon: "CheckSquare", capability: "polls.manage", section: "Programs" },
  { label: "Surveys", href: "/admin/surveys", icon: "ClipboardList", capability: "surveys.manage", section: "Programs" },
  { label: "Events", href: "/admin/events", icon: "CalendarDays", capability: "events.manage", section: "Programs" },
  { label: "Competitions", href: "/admin/competitions", icon: "Trophy", capability: "events.manage", section: "Programs" },

  { label: "Suggestions", href: "/admin/suggestions", icon: "Lightbulb", capability: "suggestions.manage", section: "Engagement" },
  { label: "Announcements", href: "/admin/announcements", icon: "Megaphone", capability: "announcements.manage", section: "Engagement" },
  { label: "FAQ", href: "/admin/faq", icon: "HelpCircle", capability: "faq.manage", section: "Engagement" },
  { label: "Notifications", href: "/admin/notifications", icon: "Bell", capability: "notifications.manage", section: "Engagement" },

  { label: "Reports", href: "/admin/reports", icon: "BarChart3", capability: "reports.view", section: "Insights" },
  { label: "Audit log", href: "/admin/audit", icon: "History", capability: "audit.view", section: "Insights" },

  { label: "Settings", href: "/admin/settings", icon: "SlidersHorizontal", capability: "settings.manage", section: "System" },
];
