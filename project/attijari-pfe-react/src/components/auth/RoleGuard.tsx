import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessPath } from '@/auth/rbac';
import { useAuthStore } from '@/stores/authStore';

interface RoleGuardProps {
  path: string;
  children: ReactNode;
}

export default function RoleGuard({ path, children }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!canAccessPath(user?.role, path)) {
    return <Navigate to="/access-denied" replace state={{ from: location }} />;
  }

  return children;
}
