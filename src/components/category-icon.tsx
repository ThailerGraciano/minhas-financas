import {
  Home,
  Car,
  ShoppingCart,
  Utensils,
  HeartPulse,
  GraduationCap,
  Sparkles,
  Gamepad2,
  PiggyBank,
  Briefcase,
  TrendingUp,
  Wallet,
  Banknote,
  Plane,
  Tv,
  Wifi,
  Smartphone,
  Coffee,
  Dumbbell,
  Tag,
  type LucideIcon
} from 'lucide-react';

export const CATEGORY_ICONS_MAP: Record<string, LucideIcon> = {
  Home,
  Car,
  ShoppingCart,
  Utensils,
  HeartPulse,
  GraduationCap,
  Sparkles,
  Gamepad2,
  PiggyBank,
  Briefcase,
  TrendingUp,
  Wallet,
  Banknote,
  Plane,
  Tv,
  Wifi,
  Smartphone,
  Coffee,
  Dumbbell,
  Tag
};

export const CATEGORY_ICONS_LIST = Object.entries(CATEGORY_ICONS_MAP).map(([name, Icon]) => ({
  name,
  Icon
}));

interface CategoryIconProps {
  name: string;
  className?: string;
}

export function CategoryIcon({ name, className }: CategoryIconProps) {
  const IconComponent = CATEGORY_ICONS_MAP[name] || Tag;
  return <IconComponent className={className} />;
}
