import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient'; // 👈 Asegúrate de que la ruta a tu cliente supabase sea correcta

export type Theme = 'light' | 'dark' | 'system';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Load initial theme preference from Supabase on mount
  useEffect(() => {
    const fetchUserTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('theme_preference')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.theme_preference) {
            const savedTheme = profile.theme_preference as Theme;
            setTheme(savedTheme);
            localStorage.setItem('theme', savedTheme);
          }
        }
      } catch (err) {
        console.error('Error fetching theme preference from Supabase:', err);
      }
    };

    fetchUserTheme();
  }, []);

  // Synchronize document classes with active theme setting & save to Supabase
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (selectedTheme: Theme) => {
      const isDark =
        selectedTheme === 'dark' ||
        (selectedTheme === 'system' && mediaQuery.matches);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Save preference to Supabase profile if user is logged in
    const saveThemeToSupabase = async (selectedTheme: Theme) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ theme_preference: selectedTheme })
            .eq('id', user.id);
        }
      } catch (err) {
        console.error('Error saving theme preference to Supabase:', err);
      }
    };

    saveThemeToSupabase(theme);

    // Listen to system preference changes when set to 'system'
    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  const currentOption = options.find((opt) => opt.value === theme) || options[2];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 rounded bg-purple-800 text-white hover:bg-purple-700 transition-colors flex items-center gap-1.5 text-xs font-medium focus:outline-none cursor-pointer"
      >
        <span>{currentOption.icon}</span>
        <span className="capitalize">{currentOption.label}</span>
        <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-50">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTheme(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                theme === opt.value
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200 font-semibold'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};