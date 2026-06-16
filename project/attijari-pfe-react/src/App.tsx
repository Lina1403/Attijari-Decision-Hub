import { Suspense, lazy, useEffect, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import DashboardShell from '@/components/layout/DashboardShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import RoleGuard from '@/components/auth/RoleGuard';
import { getDefaultPathForRole, normalizeRole } from '@/auth/rbac';
import { authService } from '@/services/authService';

function lazyPage<TModule extends { default: ComponentType }>(
  loader: () => Promise<TModule>,
) {
  const LazyComponent = lazy(loader) as LazyExoticComponent<TModule['default']> & {
    preload?: () => Promise<TModule>;
  };

  LazyComponent.preload = loader;
  return LazyComponent;
}

const ForgotPassword = lazyPage(() => import('@/pages/auth/ForgotPassword'));
const ChooseSpace = lazyPage(() => import('@/pages/auth/ChooseSpace'));
const Login = lazyPage(() => import('@/pages/auth/Login'));
const RequestAccess = lazyPage(() => import('@/pages/auth/RequestAccess'));
const SessionExpired = lazyPage(() => import('@/pages/auth/SessionExpired'));
const AdminAccessRequests = lazyPage(() => import('@/pages/admin/AdminAccessRequests'));
const AdminUsers = lazyPage(() => import('@/pages/admin/AdminUsers'));
const Profile = lazyPage(() => import('@/pages/account/Profile'));
const Settings = lazyPage(() => import('@/pages/account/Settings'));
const AccessDenied = lazyPage(() => import('@/pages/system/AccessDenied'));
const Agences = lazyPage(() => import('@/pages/dashboards/Agences'));
const Campagnes = lazyPage(() => import('@/pages/dashboards/Campagnes'));
const ClientsChurn = lazyPage(() => import('@/pages/dashboards/ClientsChurn'));
const Reclamations = lazyPage(() => import('@/pages/dashboards/Reclamations'));
const SocialMedia = lazyPage(() => import('@/pages/dashboards/SocialMedia'));
const VueGlobale = lazyPage(() => import('@/pages/dashboards/VueGlobale'));
const ClientsRisque = lazyPage(() => import('@/pages/intelligence/ClientsRisque'));
const ChurnDashboard = lazyPage(() => import('@/pages/intelligence/ChurnDashboard'));
const Explicabilite = lazyPage(() => import('@/pages/intelligence/Explicabilite'));
const Recommandations = lazyPage(() => import('@/pages/intelligence/Recommandations'));
const Simulateur = lazyPage(() => import('@/pages/intelligence/Simulateur'));
const MarketingInsights = lazyPage(() => import('@/pages/intelligence/MarketingInsights'));
const DWHConstellation = lazyPage(() => import('@/pages/eda/DWHConstellation'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary via-[#9b0c22] to-navy">
      <div className="flex h-20 w-20 items-center justify-center rounded-card bg-white/15 shadow-xl backdrop-blur-sm">
        <span className="text-2xl font-extrabold text-white">AT</span>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p className="text-sm font-medium text-white/80">Chargement de l&apos;application...</p>
      </div>
    </div>
  );
}

function ProtectedRoutes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logoutReason = useAuthStore((state) => state.logoutReason);

  if (!isAuthenticated) {
    return (
      <Navigate
        to={logoutReason === 'expired' ? '/session-expired' : '/choose-space'}
        replace
      />
    );
  }

  if (!normalizeRole(user?.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

function PublicRoutes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (isAuthenticated) {
    const defaultPath = getDefaultPathForRole(user?.role);
    if (defaultPath === '/login') {
      return <Navigate to="/access-denied" replace />;
    }

    return <Navigate to={defaultPath} replace />;
  }

  return <Outlet />;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const theme = usePreferencesStore((state) => state.theme);
  const hydratePreferences = usePreferencesStore((state) => state.hydratePreferences);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const preloadTimer = window.setTimeout(() => {
      [
        ClientsChurn,
        Campagnes,
        Reclamations,
        Agences,
        SocialMedia,
        VueGlobale,
        ClientsRisque,
        ChurnDashboard,
        Simulateur,
        Explicabilite,
        Recommandations,
        AdminAccessRequests,
        AdminUsers,
        Profile,
        Settings,
      ].forEach((page) => page.preload?.());
    }, 300);

    return () => window.clearTimeout(preloadTimer);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    let active = true;

    authService
      .getMe()
      .then((nextUser) => {
        if (active) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        // Ignore non-auth transient failures; 401 is already handled by the API interceptor.
      });

    authService
      .getPreferences()
      .then((preferences) => {
        if (active) {
          hydratePreferences(preferences);
        }
      })
      .catch(() => {
        // Ignore preferences bootstrap failures; settings page can retry explicitly.
      });

    return () => {
      active = false;
    };
  }, [accessToken, hydratePreferences, isAuthenticated, setUser]);

  return (
    <ErrorBoundary>
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicRoutes />}>
          <Route path="/choose-space" element={<ChooseSpace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/admin" element={<Login mode="admin" />} />
          <Route path="/register" element={<Navigate to="/request-access" replace />} />
          <Route path="/request-access" element={<RequestAccess />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/session-expired" element={<SessionExpired />} />
        </Route>

        <Route element={<ProtectedRoutes />}>
          <Route path="/eda-schema" element={<DWHConstellation />} />
          <Route element={<DashboardShell />}>
            <Route path="/" element={<Navigate to={getDefaultPathForRole(user?.role)} replace />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route
              path="/admin/access-requests"
              element={
                <RoleGuard path="/admin/access-requests">
                  <AdminAccessRequests />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RoleGuard path="/admin/users">
                  <AdminUsers />
                </RoleGuard>
              }
            />
            <Route path="/dashboards/vue-globale" element={<RoleGuard path="/dashboards/vue-globale"><VueGlobale /></RoleGuard>} />
            <Route path="/dashboards/clients-churn" element={<RoleGuard path="/dashboards/clients-churn"><ClientsChurn /></RoleGuard>} />
            <Route path="/dashboards/campagnes" element={<RoleGuard path="/dashboards/campagnes"><Campagnes /></RoleGuard>} />
            <Route path="/dashboards/reclamations" element={<RoleGuard path="/dashboards/reclamations"><Reclamations /></RoleGuard>} />
            <Route path="/dashboards/agences" element={<RoleGuard path="/dashboards/agences"><Agences /></RoleGuard>} />
            <Route path="/dashboards/social-media" element={<RoleGuard path="/dashboards/social-media"><SocialMedia /></RoleGuard>} />
            <Route path="/intelligence/marketing-insights" element={<RoleGuard path="/intelligence/marketing-insights"><MarketingInsights /></RoleGuard>} />
            <Route path="/intelligence/clients-risque" element={<RoleGuard path="/intelligence/clients-risque"><ClientsRisque /></RoleGuard>} />
            <Route path="/intelligence/churn-dashboard" element={<RoleGuard path="/intelligence/churn-dashboard"><ChurnDashboard /></RoleGuard>} />
            <Route
              path="/intelligence/churn-simulator"
              element={<Navigate to="/intelligence/simulateur" replace />}
            />
            <Route path="/intelligence/simulateur" element={<RoleGuard path="/intelligence/simulateur"><Simulateur /></RoleGuard>} />
            <Route path="/intelligence/explicabilite" element={<RoleGuard path="/intelligence/explicabilite"><Explicabilite /></RoleGuard>} />
            <Route
              path="/intelligence/recommandations"
              element={<RoleGuard path="/intelligence/recommandations"><Recommandations /></RoleGuard>}
            />
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to={isAuthenticated ? getDefaultPathForRole(user?.role) : '/choose-space'}
              replace
            />
          }
        />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}

export default App;
