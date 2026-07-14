'use client';

import { useState } from 'react';
import {
  Home,
  Car,
  ShoppingCart,
  Utensils,
  HeartPulse,
  GraduationCap,
  Plane,
  Wifi,
  Zap,
  Droplet,
  Smartphone,
  Tv,
  Gamepad,
  Dumbbell,
  Baby,
  PawPrint,
  Briefcase,
  Landmark,
  PiggyBank,
  CreditCard,
  Receipt,
  Wrench,
  Scissors,
  Coffee,
  Beer,
  Bus,
  Train,
  Fuel,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Car,
  ShoppingCart,
  Utensils,
  HeartPulse,
  GraduationCap,
  Plane,
  Wifi,
  Zap,
  Droplet,
  Smartphone,
  Tv,
  Gamepad,
  Dumbbell,
  Baby,
  PawPrint,
  Briefcase,
  Landmark,
  PiggyBank,
  CreditCard,
  Receipt,
  Wrench,
  Scissors,
  Coffee,
  Beer,
  Bus,
  Train,
  Fuel,
};

const ICONS_LIST = Object.entries(ICON_MAP).map(([name, Icon]) => ({
  name,
  Icon,
}));

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

export function IconPicker({ selectedIcon, onSelectIcon }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filteredIcons = ICONS_LIST.filter(({ name }) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar ícone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-1 max-h-[240px] overflow-y-auto">
        {filteredIcons.map(({ name, Icon }) => {
          const isSelected = selectedIcon === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onSelectIcon(name)}
              className={`flex aspect-square items-center justify-center rounded-md transition-all ${
                isSelected
                  ? 'bg-primary/10 ring-2 ring-primary text-primary'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
              title={name}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}

        {filteredIcons.length === 0 && (
          <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
            Nenhum ícone encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
