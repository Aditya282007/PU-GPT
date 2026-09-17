import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Menu } from 'lucide-react';

export function Header({ sidebarCollapsed = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className={`fixed top-0 right-0 h-16 bg-chalkboard/80 backdrop-blur-sm border-b border-rule-line z-30 flex items-center px-6 transition-all duration-300 ${sidebarCollapsed ? 'left-16' : 'left-64'}`}>
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-display font-medium text-xl text-chalk hidden sm:block">
            Parul University Curriculum Assistant
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-chalk/60 hover:text-chalk hover:bg-rule-line transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}