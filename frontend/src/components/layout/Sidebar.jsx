import { NavLink, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  History, 
  Flag, 
  Upload, 
  Inbox, 
  BarChart2, 
  Users, 
  Settings, 
  Database,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = {
  student: [
    { path: '/ask', label: 'Ask', icon: BookOpen },
    { path: '/history', label: 'History', icon: History },
    { path: '/flagged', label: 'My Questions', icon: Flag },
  ],
  teacher: [
    { path: '/library', label: 'Content Library', icon: Upload },
    { path: '/flagged', label: 'Flagged Questions', icon: Inbox },
    { path: '/insights', label: 'Topic Insights', icon: BarChart2 },
  ],
  admin: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/departments', label: 'Departments', icon: Database },
    { path: '/admin/users', label: 'User Management', icon: Users },
    { path: '/admin/status', label: 'System Status', icon: Settings },
  ],
};

export function Sidebar({ collapsed = false, onCollapseChange }) {
  const { user, logout, isTeacher, isAdmin, isStudent } = useAuth();
  const location = useLocation();

  const items = isAdmin ? navItems.admin : isTeacher ? navItems.teacher : navItems.student;

  return (
    <aside className={`fixed left-0 top-0 h-full bg-rule-line/20 border-r border-rule-line transition-all duration-300 z-40 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-rule-line">
        {!collapsed && (
          <NavLink to={isAdmin ? '/admin/dashboard' : isTeacher ? '/library' : '/ask'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-chalk rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-chalkboard" />
            </div>
            <span className="font-display font-medium text-lg text-chalk">PU-GPT</span>
          </NavLink>
        )}
        <button
          onClick={() => onCollapseChange?.(!collapsed)}
          className="p-2 text-chalk/50 hover:text-chalk hover:bg-rule-line rounded-lg transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {items.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-amber-chalk/15 text-amber-chalk border-l-2 border-amber-chalk' 
                  : 'text-chalk/70 hover:text-chalk hover:bg-rule-line/50'
              } ${collapsed ? 'justify-center' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-rule-line">
        {!collapsed && (
          <div className="mb-3 px-3">
            <p className="text-xs font-medium text-chalk/50 uppercase tracking-wider mb-2">Account</p>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-rule-line/50">
              <div className="w-8 h-8 bg-amber-chalk/20 rounded-full flex items-center justify-center">
                <span className="text-amber-chalk font-medium text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-chalk truncate">{user?.name}</p>
                <p className="text-xs text-chalk/50 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-chalk/70 hover:text-rust hover:bg-rust/10 transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Log out' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}