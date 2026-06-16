import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Clock3, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import { getRoleLabel } from '@/auth/labels';
import { usePageTitle } from '@/hooks/usePageTitle';
import { accessRequestService } from '@/services/accessRequestService';
import { formatRelativeTime } from '@/utils/date';
import type { AccessRequest, AccessRequestEmailDelivery } from '@/types';

const EMPTY_REQUESTS: AccessRequest[] = [];

function getStatusBadge(status: string) {
  if (status === 'APPROUVEE') {
    return 'bg-success/10 text-success';
  }

  if (status === 'REFUSEE') {
    return 'bg-danger/10 text-danger';
  }

  return 'bg-gold/10 text-gold';
}

function getStatusLabel(status: string) {
  if (status === 'APPROUVEE') return 'Approuvee';
  if (status === 'REFUSEE') return 'Refusee';
  return 'En attente';
}

export default function AdminAccessRequests() {
  usePageTitle("Demandes d'acces");

  const queryClient = useQueryClient();
  const [emailDelivery, setEmailDelivery] = useState<AccessRequestEmailDelivery | null>(
    null,
  );

  const requestsQuery = useQuery({
    queryKey: ['admin-access-requests'],
    queryFn: accessRequestService.listRequests,
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => accessRequestService.approveRequest(requestId),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['admin-access-requests'] });
      setEmailDelivery(payload.emailDelivery);
      toast.success(payload.message);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Approbation impossible.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => accessRequestService.rejectRequest(requestId),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['admin-access-requests'] });
      toast.success(payload.message);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Refus impossible.');
    },
  });

  const requests = requestsQuery.data ?? EMPTY_REQUESTS;
  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((request) => request.status === 'EN_ATTENTE').length,
      approved: requests.filter((request) => request.status === 'APPROUVEE').length,
      rejected: requests.filter((request) => request.status === 'REFUSEE').length,
    };
  }, [requests]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Administration
        </p>
        <h1 className="page-title mt-2">Demandes d acces</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Validation des demandes Marketing et Direction Marche avant creation du compte SQL.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: ShieldCheck },
          { label: 'En attente', value: stats.pending, icon: Clock3 },
          { label: 'Approuvees', value: stats.approved, icon: BadgeCheck },
          { label: 'Refusees', value: stats.rejected, icon: Mail },
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

      {emailDelivery ? (
        <div className="rounded-card border border-success/20 bg-success/5 p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-success">
            Envoi des identifiants
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm text-muted">Beneficiaire</p>
              <p className="mt-1 font-semibold text-navy">{emailDelivery.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Espace attribue</p>
              <p className="mt-1 font-semibold text-navy">{emailDelivery.spaceLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Email</p>
              <p className="mt-1 font-semibold text-navy">{emailDelivery.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Statut d envoi</p>
              <p className="mt-1 font-semibold text-navy">
                {emailDelivery.delivered ? 'E-mail envoye' : 'E-mail non envoye'}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">
            Le mot de passe temporaire est uniquement transmis par e-mail et n est pas visible par l administrateur.
            {' '}Mode : {emailDelivery.mode}.
          </p>
          {emailDelivery.error ? (
            <p className="mt-2 text-sm text-danger">{emailDelivery.error}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-card border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-navy">Liste des demandes</h2>
        </div>

        <div className="divide-y divide-border">
          {requestsQuery.isLoading ? (
            <div className="px-5 py-8 text-sm text-muted">Chargement des demandes...</div>
          ) : requests.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted">
              Aucune demande d acces n est encore enregistree.
            </div>
          ) : (
            requests.map((request) => {
              const pending = request.status === 'EN_ATTENTE';
              const mutating =
                approveMutation.isPending || rejectMutation.isPending;

              return (
                <article key={request.id} className="px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-navy">{request.fullName}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(request.status)}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                        <span className="rounded-full bg-page px-3 py-1 text-xs font-medium text-navy">
                          {getRoleLabel(request.requestedRole)}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
                        <p className="inline-flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {request.email}
                        </p>
                        <p className="inline-flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />
                          {formatRelativeTime(request.requestedAt)}
                        </p>
                        <p className="inline-flex items-center gap-2">
                          <UserRound className="h-4 w-4" />
                          Role demande : {getRoleLabel(request.requestedRole)}
                        </p>
                        {request.reviewedByName ? (
                          <p className="inline-flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Traitee par {request.reviewedByName}
                          </p>
                        ) : null}
                      </div>

                      {request.message ? (
                        <div className="rounded-brand border border-border bg-page px-4 py-3 text-sm text-muted">
                          {request.message}
                        </div>
                      ) : null}
                    </div>

                    {pending ? (
                      <div className="flex flex-wrap gap-3">
                        <Button
                          size="sm"
                          isLoading={approveMutation.isPending}
                          disabled={mutating}
                          onClick={() => approveMutation.mutate(request.id)}
                        >
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={rejectMutation.isPending}
                          disabled={mutating}
                          onClick={() => rejectMutation.mutate(request.id)}
                        >
                          Refuser
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
