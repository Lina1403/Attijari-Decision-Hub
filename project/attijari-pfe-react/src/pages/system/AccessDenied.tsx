import { AlertTriangle, ArrowLeft, ShieldOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRoleLabel } from '@/auth/labels';
import { getDefaultPathForRole } from '@/auth/rbac';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuthStore } from '@/stores/authStore';

export default function AccessDenied() {
  usePageTitle('Accès refusé');

  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const requestedPath =
    (location.state as { from?: { pathname?: string } | string } | null)?.from;
  const requestedLabel =
    typeof requestedPath === 'string'
      ? requestedPath
      : requestedPath?.pathname ?? 'cette ressource';

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Sécurité
        </p>
        <h1 className="page-title mt-2">Accès refusé</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Votre rôle actuel ne permet pas d&apos;ouvrir {requestedLabel}.
        </p>
      </div>

      <div className="rounded-card border border-danger/20 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <ShieldOff className="h-7 w-7" />
          </span>
          <div className="space-y-3">
            <p className="text-lg font-semibold text-navy">
              Autorisation insuffisante pour cette page
            </p>
            <div className="rounded-card border border-border bg-page p-4 text-sm text-muted">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-gold" />
                <div>
                  <p className="font-medium text-navy">
                    Rôle connecté : {getRoleLabel(user?.role)}
                  </p>
                  <p className="mt-1">
                    Si vous pensez que cet accès devrait être autorisé, faites valider votre rôle
                    ou reconnectez-vous avec un compte adapté.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-brand border border-border px-4 py-3 text-sm font-semibold text-navy transition hover:bg-page"
              >
                <ArrowLeft className="h-4 w-4" />
                Revenir en arrière
              </button>
              <button
                type="button"
                onClick={() => navigate(getDefaultPathForRole(user?.role), { replace: true })}
                className="inline-flex items-center gap-2 rounded-brand bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#a01024]"
              >
                Retour à mon espace
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
