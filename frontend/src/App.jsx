import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { AskPage } from '@/pages/AskPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AdminDepartmentsPage } from '@/pages/AdminDepartmentsPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { AdminStatusPage } from '@/pages/AdminStatusPage';
import { Loader2 } from 'lucide-react';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-chalkboard">
      <Loader2 className="w-10 h-10 animate-spin text-amber-chalk" />
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/ask" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (isAuthenticated) return <Navigate to="/ask" replace />;

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/ask" element={<ProtectedRoute allowedRoles={['student']}><AskPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute allowedRoles={['student']}><HistoryPage /></ProtectedRoute>} />
        
        <Route path="/library" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><LibraryPage /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><InsightsPage /></ProtectedRoute>} />
        
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={['admin']}><AdminDepartmentsPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/status" element={<ProtectedRoute allowedRoles={['admin']}><AdminStatusPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/ask" replace />} />
    </Routes>
  );
}