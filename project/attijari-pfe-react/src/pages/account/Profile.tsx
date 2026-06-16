import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Clock3, Mail, PencilLine, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import { getRoleBadgeLabel } from '@/auth/labels';
import { getTokenIssuedAt } from '@/auth/session';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { usePageTitle } from '@/hooks/usePageTitle';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/utils/date';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildInitials(firstName: string, lastName: string) {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || 'AT';
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-card border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-brand bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-1 text-sm font-semibold text-navy">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  usePageTitle('Mon profil');

  const queryClient = useQueryClient();
  const storeUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const setTokens = useAuthStore((state) => state.setTokens);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    entity: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const profileQuery = useQuery({
    queryKey: ['account-profile'],
    queryFn: authService.getProfile,
    staleTime: 60_000,
  });

  const profile = profileQuery.data ?? storeUser;
  const fallbackLastLogin = useMemo(() => getTokenIssuedAt(accessToken), [accessToken]);
  const effectiveLastLogin = profile?.lastLoginAt ?? fallbackLastLogin?.toISOString() ?? null;

  useEffect(() => {
    if (!profile) return;

    setUser(profile);
    setForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: profile.email ?? '',
      entity: profile.entity ?? 'Attijari Bank Tunisia',
    });
  }, [profile, setUser]);

  const updateProfileMutation = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (payload) => {
      setUser(payload.user);
      setTokens({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      });
      queryClient.setQueryData(['account-profile'], payload.user);
      queryClient.invalidateQueries({ queryKey: ['account-notifications'] });
      setIsEditing(false);
      setErrors({});
      toast.success(payload.message || 'Profil mis à jour.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Impossible de mettre à jour le profil.');
    },
  });

  const previewFullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim() || 'Utilisateur';
  const previewInitials = buildInitials(form.firstName, form.lastName);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.firstName.trim()) nextErrors.firstName = 'Le prénom est requis.';
    if (!form.lastName.trim()) nextErrors.lastName = 'Le nom est requis.';
    if (!EMAIL_REGEX.test(form.email.trim())) nextErrors.email = 'Adresse e-mail invalide.';
    if (!form.entity.trim()) nextErrors.entity = "L'entité est requise.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    updateProfileMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      entity: form.entity.trim(),
    });
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        email: profile.email ?? '',
        entity: profile.entity ?? 'Attijari Bank Tunisia',
      });
    }

    setErrors({});
    setIsEditing(false);
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Compte utilisateur
        </p>
        <h1 className="page-title mt-2">Mon profil</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Consultez et modifiez les informations principales du compte connecté.
        </p>
      </div>

      {profileQuery.isError ? (
        <div className="rounded-card border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {profileQuery.error instanceof Error
            ? profileQuery.error.message
            : 'Impossible de charger le profil.'}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-border bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white shadow-lg shadow-primary/20">
                {previewInitials}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Profil actif
                </p>
                <h2 className="mt-2 text-2xl font-bold text-navy">{previewFullName}</h2>
                <p className="mt-1 text-sm text-muted">{form.email || 'Email indisponible'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{getRoleBadgeLabel(profile?.role)}</Badge>
                  <Badge tone="muted">{form.entity || 'Attijari Bank Tunisia'}</Badge>
                </div>
              </div>
            </div>

            {!isEditing ? (
              <Button
                variant="secondary"
                leftIcon={<PencilLine className="h-4 w-4" />}
                onClick={() => setIsEditing(true)}
              >
                Modifier
              </Button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Input
              label="Prénom"
              value={form.firstName}
              onChange={(event) => setForm((state) => ({ ...state, firstName: event.target.value }))}
              disabled={!isEditing}
              error={errors.firstName}
              leftIcon={<User className="h-4 w-4" />}
            />
            <Input
              label="Nom"
              value={form.lastName}
              onChange={(event) => setForm((state) => ({ ...state, lastName: event.target.value }))}
              disabled={!isEditing}
              error={errors.lastName}
              leftIcon={<User className="h-4 w-4" />}
            />
            <Input
              label="Adresse e-mail"
              type="email"
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
              disabled={!isEditing}
              error={errors.email}
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Entité"
              value={form.entity}
              onChange={(event) => setForm((state) => ({ ...state, entity: event.target.value }))}
              disabled={!isEditing}
              error={errors.entity}
              leftIcon={<Building2 className="h-4 w-4" />}
            />
          </div>

          <div className="mt-6 rounded-card border border-border bg-page p-4 text-sm text-muted">
            {isEditing
              ? 'Les modifications enregistrées mettront à jour votre session immédiatement.'
              : 'Le profil est relié au backend. Vous pouvez mettre à jour vos informations principales.'}
          </div>

          {isEditing ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="submit" isLoading={updateProfileMutation.isPending}>
                Enregistrer les modifications
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Annuler
              </Button>
            </div>
          ) : null}
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard icon={User} label="Nom complet" value={profile?.fullName ?? 'Non disponible'} />
          <InfoCard icon={Mail} label="Adresse e-mail" value={profile?.email ?? 'Non disponible'} />
          <InfoCard icon={ShieldCheck} label="Rôle" value={getRoleBadgeLabel(profile?.role)} />
          <InfoCard
            icon={Building2}
            label="Entité"
            value={profile?.entity ?? 'Attijari Bank Tunisia'}
          />
          <InfoCard
            icon={Clock3}
            label="Dernière connexion"
            value={formatDateTime(effectiveLastLogin)}
          />
          <InfoCard
            icon={Clock3}
            label="Compte créé le"
            value={formatDateTime(profile?.createdAt)}
          />
        </div>
      </div>
    </section>
  );
}
