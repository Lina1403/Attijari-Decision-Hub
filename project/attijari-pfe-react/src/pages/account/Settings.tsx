import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getRoleLabel } from '@/auth/labels';
import { getTokenExpirationDate, getTokenIssuedAt } from '@/auth/session';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { usePageTitle } from '@/hooks/usePageTitle';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { AppTheme, NotificationPreferences, UserNotification, UserPreferences } from '@/types';
import { formatDateTime } from '@/utils/date';

function SectionCard({
  id,
  title,
  description,
  icon: Icon,
  highlighted = false,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  icon: typeof Bell;
  highlighted?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`rounded-card border bg-white p-5 shadow-sm transition ${
        highlighted ? 'border-primary/40 ring-2 ring-primary/10' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-brand bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ChoiceCard({
  active,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: typeof Sun;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-card border p-4 text-left transition ${
        active
          ? 'border-primary bg-primary-soft text-navy'
          : 'border-border bg-page text-navy hover:border-primary/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-brand bg-white/80 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  icon: typeof Bell;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-start justify-between gap-4 rounded-card border border-border bg-page px-4 py-3 text-left transition hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-brand bg-white text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-navy">{label}</p>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>
      </div>

      <span
        className={`mt-1 inline-flex min-w-[78px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${
          value ? 'bg-success/10 text-success' : 'bg-navy-soft text-muted'
        }`}
      >
        {value ? 'Activé' : 'Désactivé'}
      </span>
    </button>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  pending,
}: {
  notification: UserNotification;
  onMarkRead: (id: string) => void;
  pending: boolean;
}) {
  const tone = notification.readAt ? 'muted' : 'primary';

  return (
    <div className="rounded-card border border-border bg-page p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-navy">{notification.title}</p>
            <Badge tone={tone}>{notification.readAt ? 'Lu' : 'Nouveau'}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">{notification.message}</p>
          <p className="mt-2 text-xs text-muted">{formatDateTime(notification.createdAt)}</p>
        </div>

        {!notification.readAt ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => onMarkRead(notification.id)}
          >
            Marquer comme lu
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function Settings() {
  usePageTitle('Paramètres');

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const rememberMe = useAuthStore((state) => state.rememberMe);
  const logout = useAuthStore((state) => state.logout);
  const setTokens = useAuthStore((state) => state.setTokens);

  const language = usePreferencesStore((state) => state.language);
  const theme = usePreferencesStore((state) => state.theme);
  const contentDensity = usePreferencesStore((state) => state.contentDensity);
  const notificationPreferences = usePreferencesStore((state) => state.notifications);
  const hydratePreferences = usePreferencesStore((state) => state.hydratePreferences);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showReadNotifications, setShowReadNotifications] = useState(false);

  const section = searchParams.get('section');
  const accessTokenExpiry = useMemo(() => getTokenExpirationDate(accessToken), [accessToken]);
  const refreshTokenExpiry = useMemo(() => getTokenExpirationDate(refreshToken), [refreshToken]);
  const fallbackLastLogin = useMemo(() => getTokenIssuedAt(accessToken), [accessToken]);
  const effectiveLastLogin = user?.lastLoginAt ?? fallbackLastLogin?.toISOString() ?? null;

  const preferencesQuery = useQuery({
    queryKey: ['account-preferences'],
    queryFn: authService.getPreferences,
    staleTime: 60_000,
  });

  const notificationsQuery = useQuery({
    queryKey: ['account-notifications'],
    queryFn: authService.getNotifications,
    staleTime: 20_000,
  });

  useEffect(() => {
    if (section === 'notifications') {
      notificationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [section]);

  useEffect(() => {
    if (preferencesQuery.data) {
      hydratePreferences(preferencesQuery.data);
    }
  }, [hydratePreferences, preferencesQuery.data]);

  const currentPreferences: UserPreferences = {
    language,
    theme,
    contentDensity,
    notifications: notificationPreferences,
  };

  const handleLogout = async () => {
    await authService.logout(refreshToken);
    logout('manual');
    navigate('/choose-space', { replace: true });
  };

  const updatePreferencesMutation = useMutation({
    mutationFn: authService.updatePreferences,
    onSuccess: (payload) => {
      hydratePreferences(payload.preferences);
      queryClient.setQueryData(['account-preferences'], payload.preferences);
      queryClient.invalidateQueries({ queryKey: ['account-notifications'] });
      toast.success(payload.message || 'Préférences enregistrées.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Impossible de mettre à jour les préférences.',
      );
      queryClient.invalidateQueries({ queryKey: ['account-preferences'] });
    },
  });

  const markNotificationsMutation = useMutation({
    mutationFn: authService.markNotificationsRead,
    onSuccess: (payload) => {
      queryClient.setQueryData(['account-notifications'], payload);
      toast.success('Notifications mises à jour.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Impossible de mettre à jour les notifications.',
      );
    },
  });

  const clearReadNotificationsMutation = useMutation({
    mutationFn: authService.clearReadNotifications,
    onSuccess: (payload) => {
      queryClient.setQueryData(['account-notifications'], payload);
      setShowReadNotifications(false);
      toast.success('Les notifications lues ont été supprimées.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Impossible de supprimer les notifications lues.',
      );
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: (payload) => {
      setTokens({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
      queryClient.invalidateQueries({ queryKey: ['account-notifications'] });
      toast.success(payload.message || 'Mot de passe mis à jour.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Impossible de changer le mot de passe.');
    },
  });

  const commitPreferences = (nextPreferences: UserPreferences) => {
    hydratePreferences(nextPreferences);
    updatePreferencesMutation.mutate(nextPreferences);
  };

  const updateTheme = (nextTheme: AppTheme) => {
    commitPreferences({
      ...currentPreferences,
      theme: nextTheme,
    });
  };

  const updateDensity = (nextDensity: UserPreferences['contentDensity']) => {
    commitPreferences({
      ...currentPreferences,
      contentDensity: nextDensity,
    });
  };

  const updateNotificationPreference = (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    commitPreferences({
      ...currentPreferences,
      notifications: {
        ...currentPreferences.notifications,
        [key]: value,
      },
    });
  };

  const handlePasswordSubmit = () => {
    const nextErrors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      nextErrors.currentPassword = 'Le mot de passe actuel est requis.';
    }

    if (passwordForm.newPassword.length < 6) {
      nextErrors.newPassword = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
    }

    if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }

    setPasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const readNotifications = notifications.filter((notification) => Boolean(notification.readAt));
  const visibleNotifications = showReadNotifications ? notifications : unreadNotifications;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Préférences utilisateur
        </p>
        <h1 className="page-title mt-2">Paramètres</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Gérez votre interface, vos notifications, votre sécurité et votre session active.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          id="preferences"
          title="Interface"
          description="Préférences réellement enregistrées pour votre compte."
          icon={LayoutGrid}
        >
          <div className="space-y-5">
            <div className="rounded-card border border-border bg-page p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-navy">Langue de l’interface</p>
                  <p className="mt-1 text-xs text-muted">
                    Le français est actuellement la langue active de l’application.
                  </p>
                </div>
                <Badge tone="primary">{language === 'fr' ? 'Français' : language}</Badge>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-navy">Densité d’affichage</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  active={contentDensity === 'comfortable'}
                  title="Confortable"
                  description="Espacement standard pour une lecture plus aérée."
                  icon={LayoutGrid}
                  onClick={() => updateDensity('comfortable')}
                />
                <ChoiceCard
                  active={contentDensity === 'compact'}
                  title="Compacte"
                  description="Davantage d’information visible à l’écran."
                  icon={LayoutGrid}
                  onClick={() => updateDensity('compact')}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="theme"
          title="Thème"
          description="Mode clair ou sombre appliqué à l’interface."
          icon={Moon}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={theme === 'light' ? 'gold' : 'primary'}>
                Thème actuel : {theme === 'light' ? 'clair' : 'sombre'}
              </Badge>
              {preferencesQuery.isFetching || updatePreferencesMutation.isPending ? (
                <Badge tone="muted">Synchronisation en cours</Badge>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                active={theme === 'light'}
                title="Mode clair"
                description="Palette lumineuse pour les espaces de pilotage."
                icon={Sun}
                onClick={() => updateTheme('light')}
              />
              <ChoiceCard
                active={theme === 'dark'}
                title="Mode sombre"
                description="Ambiance plus douce pour les consultations prolongées."
                icon={Moon}
                onClick={() => updateTheme('dark')}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="notifications"
          title="Notifications"
          description="Préférences de diffusion et centre de notifications."
          icon={Bell}
          highlighted={section === 'notifications'}
        >
          <div ref={notificationsRef} className="space-y-5">
            <div className="grid gap-3">
              <ToggleRow
                label="Notifications dans l’application"
                description="Affiche les alertes de suivi directement dans votre espace."
                value={notificationPreferences.inAppEnabled}
                onChange={(value) => updateNotificationPreference('inAppEnabled', value)}
                icon={Bell}
              />
              <ToggleRow
                label="Notifications e-mail"
                description="Reçoit les résumés et alertes sur votre adresse professionnelle."
                value={notificationPreferences.emailEnabled}
                onChange={(value) => updateNotificationPreference('emailEnabled', value)}
                icon={Mail}
              />
              <ToggleRow
                label="Résumé hebdomadaire"
                description="Active un digest synthétique des mouvements clés de la semaine."
                value={notificationPreferences.weeklyDigest}
                onChange={(value) => updateNotificationPreference('weeklyDigest', value)}
                icon={Mail}
              />
              <ToggleRow
                label="Alertes churn"
                description="Met en avant les signaux clients à risque et les actions prioritaires."
                value={notificationPreferences.churnAlerts}
                onChange={(value) => updateNotificationPreference('churnAlerts', value)}
                icon={Smartphone}
              />
              <ToggleRow
                label="Alertes marketing"
                description="Signale les évolutions utiles pour la Direction Marketing."
                value={notificationPreferences.marketingAlerts}
                onChange={(value) => updateNotificationPreference('marketingAlerts', value)}
                icon={Bell}
              />
            </div>

            <div className="rounded-card border border-border bg-page p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-navy">Centre de notifications</p>
                  <p className="mt-1 text-xs text-muted">
                    {unreadCount > 0
                      ? `${unreadCount} notification(s) non lue(s).`
                      : 'Aucune notification active. Les lues sont masquées de la vue principale.'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Une notification lue disparaît automatiquement de la liste active.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={readNotifications.length === 0}
                    onClick={() => setShowReadNotifications((value) => !value)}
                  >
                    {showReadNotifications
                      ? 'Masquer les lues'
                      : `Afficher les lues (${readNotifications.length})`}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={unreadCount === 0 || markNotificationsMutation.isPending}
                    onClick={() => markNotificationsMutation.mutate({ all: true })}
                  >
                    Tout marquer comme lu
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      readNotifications.length === 0 || clearReadNotificationsMutation.isPending
                    }
                    onClick={() => clearReadNotificationsMutation.mutate()}
                  >
                    Supprimer les lues
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {notificationsQuery.isLoading ? (
                  <div className="rounded-card border border-border bg-white p-4 text-sm text-muted">
                    Chargement des notifications...
                  </div>
                ) : visibleNotifications.length > 0 ? (
                  visibleNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      pending={
                        markNotificationsMutation.isPending ||
                        clearReadNotificationsMutation.isPending
                      }
                      onMarkRead={(id) => markNotificationsMutation.mutate({ ids: [id] })}
                    />
                  ))
                ) : (
                  <div className="rounded-card border border-border bg-white p-4 text-sm text-muted">
                    {readNotifications.length > 0
                      ? 'Toutes les notifications actives ont été lues. Tu peux afficher ou supprimer les lues si besoin.'
                      : 'Aucune notification disponible pour le moment.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="security"
          title="Sécurité et session"
          description="Informations de sécurité de votre compte et changement de mot de passe."
          icon={ShieldCheck}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-card border border-border bg-page p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Rôle</p>
              <p className="mt-1 text-sm font-semibold text-navy">{getRoleLabel(user?.role)}</p>
            </div>
            <div className="rounded-card border border-border bg-page p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Entité
              </p>
              <p className="mt-1 text-sm font-semibold text-navy">
                {user?.entity ?? 'Attijari Bank Tunisia'}
              </p>
            </div>
            <div className="rounded-card border border-border bg-page p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Session persistante
              </p>
              <p className="mt-1 text-sm font-semibold text-navy">
                {rememberMe ? 'Oui, mémorisée' : 'Non, session navigateur'}
              </p>
            </div>
            <div className="rounded-card border border-border bg-page p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Dernière connexion
              </p>
              <p className="mt-1 text-sm font-semibold text-navy">
                {formatDateTime(effectiveLastLogin)}
              </p>
            </div>
            <div className="rounded-card border border-border bg-page p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Expiration du jeton d&apos;accès
              </p>
              <p className="mt-1 text-sm font-semibold text-navy">
                {formatDateTime(accessTokenExpiry)}
              </p>
            </div>
            <div className="rounded-card border border-border bg-page p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Expiration du jeton de rafraîchissement
              </p>
              <p className="mt-1 text-sm font-semibold text-navy">
                {formatDateTime(refreshTokenExpiry)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-card border border-border bg-page p-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 text-primary" />
              <div className="w-full">
                <p className="font-medium text-navy">Gestion de mot de passe</p>
                <p className="mt-1 text-sm text-muted">
                  Le mot de passe peut être changé ici sans quitter votre session.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input
                    label="Mot de passe actuel"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((state) => ({
                        ...state,
                        currentPassword: event.target.value,
                      }))
                    }
                    error={passwordErrors.currentPassword}
                  />
                  <div />
                  <Input
                    label="Nouveau mot de passe"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((state) => ({
                        ...state,
                        newPassword: event.target.value,
                      }))
                    }
                    error={passwordErrors.newPassword}
                  />
                  <Input
                    label="Confirmer le nouveau mot de passe"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((state) => ({
                        ...state,
                        confirmPassword: event.target.value,
                      }))
                    }
                    error={passwordErrors.confirmPassword}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    isLoading={changePasswordMutation.isPending}
                    onClick={handlePasswordSubmit}
                  >
                    Mettre à jour le mot de passe
                  </Button>
                  <Button variant="secondary" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
