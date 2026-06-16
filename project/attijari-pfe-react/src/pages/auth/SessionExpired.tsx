import { useEffect } from 'react';
import { Clock3, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuthStore } from '@/stores/authStore';

export default function SessionExpired() {
  usePageTitle('Session expirée');

  const clearLogoutReason = useAuthStore((state) => state.clearLogoutReason);

  useEffect(() => {
    clearLogoutReason();
  }, [clearLogoutReason]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-[#9b0c22] to-navy p-4">
      <div className="w-full max-w-xl rounded-card bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-danger/10 text-danger">
          <Clock3 className="h-10 w-10" />
        </span>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Sécurité de session
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy">Votre session a expiré</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Pour protéger l&apos;application, vous devez vous reconnecter avant de continuer.
        </p>

        <div className="mt-6 rounded-card border border-border bg-page p-4 text-sm text-muted">
          Les jetons d&apos;authentification ont été invalidés ou ont expiré. Aucune donnée BI ou
          ML n&apos;a été modifiée.
        </div>

        <Link
          to="/choose-space"
          className="mt-6 inline-flex items-center gap-2 rounded-brand bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#a01024]"
        >
          <LogIn className="h-4 w-4" />
          Reprendre la connexion
        </Link>
      </div>
    </div>
  );
}
