import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';

export type Theme = 'light' | 'dark' | 'system';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('admin_theme') as Theme) || 'system';
  });
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Cargar la preferencia de tema del negocio desde Supabase inmediatamente al montar
  useEffect(() => {
    let isMounted = true;

    const fetchBusinessTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: business, error } = await supabase
          .from('businesses')
          .select('id, admin_theme')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching business admin_theme:', error.message);
          return;
        }

        if (business && isMounted) {
          setBusinessId(business.id);
          // Si existe un tema guardado en la BD, lo aplicamos de inmediato
          if (business.admin_theme) {
            const savedTheme = business.admin_theme as Theme;
            setTheme(savedTheme);
            localStorage.setItem('admin_theme', savedTheme);
          }
        }
      } catch (err) {
        console.error('Error loading admin theme from Supabase:', err);
      }
    };

    fetchBusinessTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Sincronizar clases globales (<html>) con el tema activo
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
    localStorage.setItem('admin_theme', theme);

    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  // 3. Guardar el cambio en Supabase
  const handleSelectTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
    localStorage.setItem('admin_theme', newTheme);

    try {
      if (businessId) {
        await supabase
          .from('businesses')
          .update({ admin_theme: newTheme })
          .eq('id', businessId);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('businesses')
            .update({ admin_theme: newTheme })
            .eq('owner_id', user.id);
        }
      }
    } catch (err) {
      console.error('Error saving admin_theme to Supabase:', err);
    }
  };

  // Cerrar dropdown al hacer clic fuera
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
        className="px-3 py-1.5 rounded-lg bg-purple-800 text-white hover:bg-purple-700 transition-colors flex items-center gap-1.5 text-xs font-medium focus:outline-none cursor-pointer shadow-sm"
      >
        <span>{currentOption.icon}</span>
        <span className="capitalize">{currentOption.label}</span>
        <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg py-1 z-50">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelectTheme(opt.value)}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                theme === opt.value
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200 font-semibold'
                  : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'
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