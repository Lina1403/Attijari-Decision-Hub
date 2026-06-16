import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { getRoleLabel } from '@/auth/labels';
import Button from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/usePageTitle';
import { adminUserService, type AdminUser } from '@/services/adminUserService';
import { formatRelativeTime } from '@/utils/date';

const EMPTY_USERS: AdminUser[] = [];

function getRoleBadge(role: string) {
  if (role === 'ADMIN') return 'bg-primary/10 text-primary';
  if (role === 'MARKETING') return 'bg-gold/10 text-gold';
  return 'bg-success/10 text-success';
}

export default function AdminUsers() {
  usePageTitle('Comptes utilisateurs');

  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminUserService.listUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminUserService.deleteUser(userId),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
      toast.success(payload.message);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible.');
    },
  });

  const users = usersQuery.data ?? EMPTY_USERS;
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      marketing: users.filter((user) => user.role === 'MARKETING').length,
      commercial: users.filter((user) => user.role === 'COMMERCIAL').length,
    };
  }, [users]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Administration
        </p>
        <h1 className="page-title mt-2">Comptes utilisateurs</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Gestion des comptes actifs autorises a se connecter a la plateforme.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total actifs', value: stats.total, icon: UserRound },
          { label: 'Admins', value: stats.admins, icon: ShieldCheck },
          { label: 'Marketing', value: stats.marketing, icon: Mail },
          { label: 'Commercial', value: stats.commercial, icon: UserRound },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-card border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted">{item.label}</p>
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-4 text-3xl font-bold text-navy">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-card border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-navy">Liste des comptes</h2>
        </div>

        <div className="divide-y divide-border">
          {usersQuery.isLoading ? (
            <div className="px-5 py-8 text-sm text-muted">Chargement des comptes...</div>
          ) : users.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted">Aucun compte actif.</div>
          ) : (
            users.map((user) => (
              <article key={user.id} className="px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                        {user.initials}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-navy">{user.fullName}</h3>
                        <p className="text-sm text-muted">{user.email}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadge(String(user.role))}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
                      <p>Entite : {user.entity}</p>
                      <p>
                        Derniere connexion :{' '}
                        {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Jamais'}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="danger"
                    disabled={!user.canDelete || deleteMutation.isPending}
                    isLoading={deleteMutation.isPending && selectedUser?.id === user.id}
                    onClick={() => setSelectedUser(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-card bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-navy">Supprimer le compte ?</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              {selectedUser.fullName} ne pourra plus se connecter. Cette action retire aussi sa
              session active.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                disabled={deleteMutation.isPending}
                onClick={() => setSelectedUser(null)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selectedUser.id)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
