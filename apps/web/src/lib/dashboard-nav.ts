import type { LucideIcon } from "lucide-react";
import { Heart, History, LayoutDashboard, MapPin } from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/trips", label: "Chuyến đi", icon: MapPin },
  { href: "/favorites", label: "Yêu thích", icon: Heart },
  { href: "/history", label: "Lịch sử", icon: History },
];

export function isDashboardNavActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === "/trips") {
    return (
      pathname === "/trips" ||
      pathname === "/ai" ||
      (pathname.startsWith("/trips/") && pathname !== "/trips/new")
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
