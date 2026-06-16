import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getRoleLabel } from '@/auth/labels';
import { filterNavigationByRole } from '@/auth/rbac';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { formatLongDate } from '@/utils/date';
import { getBreadcrumbs, navigationGroups } from '@/utils/navigation';

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolveSearchTarget(searchQuery: string, role?: string) {
  const trimmed = searchQuery.trim();
  const normalized = normalize(trimmed);
  const items = filterNavigationByRole(navigationGroups, role).flatMap((group) => [
    ...group.items,
    ...group.items.flatMap((item) => item.children ?? []),
  ]);

  const direct = items.find((item) => normalize(item.label).includes(normalized));
  if (direct) return direct.path;

  const allowedFallback = (path: string) =>
    items.some((item) => item.path === path) ? path : items[0]?.path;

  if (normalized.includes('globale') || normalized.includes('global')) {
    return allowedFallback('/dashboards/vue-globale') ?? '/login';
  }
  if (normalized.includes('agence')) return allowedFallback('/dashboards/agences') ?? '/login';
  if (normalized.includes('reclamation')) {
    return allowedFallback('/dashboards/reclamations') ?? '/login';
  }
  if (normalized.includes('campagne')) return allowedFallback('/dashboards/campagnes') ?? '/login';
  if (normalized.includes('social') || normalized.includes('reseau')) {
    return allowedFallback('/dashboards/social-media') ?? '/login';
  }
  if (normalized.includes('explic')) return allowedFallback('/intelligence/explicabilite') ?? '/login';
  if (normalized.includes('recommand')) {
    return allowedFallback('/intelligence/recommandations') ?? '/login';
  }
  if (normalized.includes('simulat')) return allowedFallback('/intelligence/simulateur') ?? '/login';
  if (normalized.includes('demande') || normalized.includes('admin')) {
    return allowedFallback('/admin/access-requests') ?? '/choose-space';
  }
  if (normalized.includes('profil')) return '/profile';
  if (normalized.includes('param')) return '/settings';

  return items[0]?.path ?? '/choose-space';
}

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const openSidebar = useUIStore((state) => state.openSidebar);

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const notificationsQuery = useQuery({
    queryKey: ['account-notifications'],
    queryFn: authService.getNotifications,
    staleTime: 20_000,
  });

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    navigate(resolveSearchTarget(trimmed, user?.role));
    setSearchQuery('');
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await authService.logout(refreshToken);
    logout('manual');
    navigate('/choose-space', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white shadow-sm">
      <div className="flex h-[60px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-brand border border-border text-muted lg:hidden"
          onClick={openSidebar}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 lg:max-w-[320px]">
          <nav className="flex items-center gap-2 overflow-x-auto text-sm text-muted scrollbar-thin">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.path} className="inline-flex items-center gap-2 whitespace-nowrap">
                {index > 0 ? <span>/</span> : null}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-navy">{crumb.label}</span>
                ) : (
                  <Link className="transition hover:text-primary" to={crumb.path}>
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
          <p className="mt-0.5 text-xs text-muted">{formatLongDate()}</p>
        </div>

        <form className="hidden flex-1 md:block" onSubmit={handleSearchSubmit}>
          <label className="flex h-10 items-center gap-3 rounded-brand border border-border bg-page px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="h-4 w-4 text-muted" aria-hidden="true" />
            <input
              className="h-full w-full bg-transparent text-sm text-navy placeholder:text-muted outline-none"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un client, une agence ou une page"
              aria-label="Rechercher"
            />
          </label>
        </form>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-brand border border-border text-muted transition hover:border-primary/30 hover:text-primary"
            aria-label="Notifications"
            onClick={() => navigate('/settings?section=notifications')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <>
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </>
            ) : null}
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-brand border border-border px-2.5 text-sm text-navy transition hover:border-primary/30"
              onClick={() => setProfileOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {user?.initials ?? 'AT'}
              </span>
              <span className="hidden sm:block">{user?.firstName ?? 'Utilisateur'}</span>
              <ChevronDown
                className={`h-4 w-4 text-muted transition-transform ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {profileOpen ? (
              <div
                className="absolute right-0 top-12 z-30 w-72 rounded-card border border-border bg-white shadow-lg"
                role="menu"
              >
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {user?.initials ?? 'AT'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{user?.fullName}</p>
                      <p className="truncate text-xs text-muted">{user?.email}</p>
                      <p className="mt-0.5 text-xs font-medium text-primary">
                        {getRoleLabel(user?.role)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-1.5">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-brand px-3 py-2 text-left text-sm text-muted transition hover:bg-page hover:text-navy"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/profile');
                    }}
                    role="menuitem"
                  >
                    <User className="h-4 w-4 flex-shrink-0" />
                    Mon profil
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-brand px-3 py-2 text-left text-sm text-muted transition hover:bg-page hover:text-navy"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    role="menuitem"
                  >
                    <Settings className="h-4 w-4 flex-shrink-0" />
                    Paramètres
                  </button>

                  <div className="my-1 border-t border-border" />

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-brand px-3 py-2 text-left text-sm text-danger transition hover:bg-danger/5"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    Déconnexion
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
