import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Bell, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function Header({ sidebarCollapsed = false }) {
  const { isDark, toggleTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-lg text-chalk/60 hover:text-chalk hover:bg-rule-line transition-colors relative"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rust text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-rule-line/20 border border-rule-line rounded-xl shadow-lg p-4 animate-in">
                <p className="text-sm text-chalk/60">No new notifications</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}