// types/navigation.ts
export interface MenuItem {
  label: string;
  href: string;
  icon?: string;
  isPro?: boolean;
}

export const ADMIN_MENU_ITEMS: MenuItem[] = [
  { label: 'Overview', href: '/admin/overview' },
  { label: 'Services', href: '/admin/services' },
  { label: 'Appointments', href: '/admin/appointments' },
  { label: 'Analytics', href: '/admin/analytics', isPro: true }, // Restricted item
  { label: 'Settings', href: '/admin/settings' },
];