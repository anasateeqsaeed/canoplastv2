import { Moon, Sun, Waves, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, ThemeType } from '@/contexts/ThemeContext';

const themes: { id: ThemeType; label: string; icon: typeof Moon; description: string }[] = [
  { id: 'industrial', label: 'Industrial Dark', icon: Moon, description: 'Default dark theme' },
  { id: 'light', label: 'Light', icon: Sun, description: 'Clean light theme' },
  { id: 'ocean', label: 'Ocean Blue', icon: Waves, description: 'Navy blue theme' },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const currentTheme = themes.find(t => t.id === theme) || themes[0];
  const Icon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Icon size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((t) => {
          const ThemeIcon = t.icon;
          return (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ThemeIcon size={16} />
                <span>{t.label}</span>
              </div>
              {theme === t.id && <Check size={16} className="text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
