import { useEffect } from 'react';
import { ChevronDown, LogOut, Settings, User, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getRoleLabel } from '@/auth/labels';
import { filterNavigationByRole } from '@/auth/rbac';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';
import { iconMap } from '@/utils/icons';
import { navigationGroups } from '@/utils/navigation';

export default function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const closeSidebar = useUIStore((state) => state.closeSidebar);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const navigate = useNavigate();
  const location = useLocation();
  const visibleNavigationGroups = filterNavigationByRole(navigationGroups, user?.role);

  useEffect(() => {
    if (isDesktop) {
      closeSidebar();
    }
  }, [closeSidebar, isDesktop]);

  const handleLogout = async () => {
    closeSidebar();
    await authService.logout(refreshToken);
    logout('manual');
    navigate('/choose-space', { replace: true });
  };

  return (
    <>
      {!isDesktop && isSidebarOpen ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-navy transition duration-300 ease-attijari-out lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-[64px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-brand bg-primary shadow-lg shadow-primary/30">
              <span className="text-sm font-extrabold text-white">AT</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Attijari Bank</p>
              <p className="text-xs text-white/50">Decision Hub</p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-brand text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
            onClick={closeSidebar}
            aria-label="Fermer la navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
          {visibleNavigationGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white/35">
                {group.label}
              </p>
              <nav className="space-y-0.5" aria-label={group.label}>
                {group.items.map((item) => {
                  const Icon = iconMap[item.icon];
                  const childIsActive = item.children?.some(
                    (child) => `${location.pathname}${location.search}` === child.path,
                  );

                  return (
                    <div key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => {
                          if (!item.children?.length) {
                            closeSidebar();
                          }
                        }}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-3 rounded-brand px-3 py-3 text-[15px] font-semibold transition duration-150',
                            isActive || childIsActive
                              ? 'bg-primary text-white shadow-sm shadow-primary/25'
                              : 'text-white/65 hover:bg-white/8 hover:text-white',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive || childIsActive ? (
                              <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-white/80" />
                            ) : null}
                            <Icon
                              className={cn(
                                'h-5 w-5 flex-shrink-0 transition',
                                isActive || childIsActive
                                  ? 'text-white'
                                  : 'text-white/50 group-hover:text-white/80',
                              )}
                              aria-hidden="true"
                            />
                            <span className="truncate">{item.label}</span>
                            {item.children?.length ? (
                              <ChevronDown className="ml-auto h-4 w-4 text-white/70" />
                            ) : null}
                          </>
                        )}
                      </NavLink>

                      {item.children?.length ? (
                        <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-3">
                          {item.children.map((child) => {
                            const ChildIcon = iconMap[child.icon];
                            return (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                onClick={closeSidebar}
                                className={() =>
                                  cn(
                                    'flex items-center gap-2 rounded-brand px-3 py-2.5 text-sm font-semibold transition',
                                    `${location.pathname}${location.search}` === child.path
                                      ? 'bg-white/12 text-white'
                                      : 'text-white/55 hover:bg-white/8 hover:text-white',
                                  )
                                }
                              >
                                <ChildIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{child.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="rounded-brand bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow shadow-primary/20">
                {user?.initials ?? 'AT'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.fullName ?? 'Utilisateur'}
                </p>
                <p className="truncate text-xs text-white/50">{getRoleLabel(user?.role)}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  closeSidebar();
                  navigate('/profile');
                }}
                className="flex items-center justify-center gap-1.5 rounded-brand bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/15 hover:text-white"
              >
                <User className="h-3.5 w-3.5" />
                Profil
              </button>
              <button
                type="button"
                onClick={() => {
                  closeSidebar();
                  navigate('/settings');
                }}
                className="flex items-center justify-center gap-1.5 rounded-brand bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/15 hover:text-white"
              >
                <Settings className="h-3.5 w-3.5" />
                Paramètres
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-brand bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-danger/20 hover:text-danger"
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
