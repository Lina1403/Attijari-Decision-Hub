import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getDefaultPathForRole } from '@/auth/rbac';
import { getSpaceDescription, getSpaceLabel } from '@/auth/labels';
import { usePageTitle } from '@/hooks/usePageTitle';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import type { AccessSpace } from '@/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

interface LoginProps {
  mode?: 'standard' | 'admin';
}

function resolveSelectedSpace(mode: 'standard' | 'admin', searchParams: URLSearchParams): AccessSpace {
  if (mode === 'admin') {
    return 'admin';
  }

  return searchParams.get('space') === 'commercial' ? 'commercial' : 'marketing';
}

export default function Login({ mode = 'standard' }: LoginProps) {
  usePageTitle(mode === 'admin' ? 'Connexion administrateur' : 'Connexion');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeLogin = useAuthStore((state) => state.login);
  const selectedSpace = resolveSelectedSpace(mode, searchParams);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const isAdminSpace = selectedSpace === 'admin';
  const requestAccessPath = useMemo(() => {
    if (selectedSpace === 'commercial') {
      return '/request-access?space=commercial';
    }

    return '/request-access?space=marketing';
  }, [selectedSpace]);

  const validate = () => {
    const next: FormErrors = {};

    if (!EMAIL_REGEX.test(email.trim())) {
      next.email = 'Adresse e-mail invalide.';
    }

    if (password.length < 6) {
      next.password = 'Le mot de passe doit contenir au moins 6 caracteres.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const { user, accessToken, refreshToken } = await authService.login(
        email.trim(),
        password,
        selectedSpace,
      );
      storeLogin(user, { accessToken, refreshToken }, rememberMe);
      navigate(getDefaultPathForRole(user.role), { replace: true });
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Connexion impossible.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-[#9b0c22] to-navy p-4">
      <div className="w-full max-w-[460px]">
        <div className="mb-4 flex items-center justify-between text-white/80">
          <Link
            to="/choose-space"
            className="inline-flex items-center gap-2 text-sm font-medium transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au choix de l espace
          </Link>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
            {getSpaceLabel(selectedSpace)}
          </span>
        </div>

        <div className="overflow-hidden rounded-card bg-white shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary to-[#FF4C6C]" />

          <div className="px-8 py-8">
            {errors.general ? (
              <div className="mb-6 flex items-start gap-3 rounded-brand border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{errors.general}</span>
              </div>
            ) : null}

            <div className="mb-8 flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-card bg-primary shadow-lg shadow-primary/30">
                {isAdminSpace ? (
                  <ShieldCheck className="h-9 w-9 text-white" />
                ) : (
                  <span className="text-2xl font-extrabold tracking-tight text-white">AT</span>
                )}
              </div>
              <h1 className="mt-4 text-2xl font-bold text-navy">{getSpaceLabel(selectedSpace)}</h1>
              <p className="mt-2 text-sm text-muted">{getSpaceDescription(selectedSpace)}</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-semibold text-navy">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="prenom.nom@attijari.tn"
                    className={[
                      'w-full rounded-brand border bg-white py-2.5 pl-9 pr-3 text-sm text-navy',
                      'outline-none transition placeholder:text-muted/60',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20',
                      errors.email
                        ? 'border-danger focus:border-danger focus:ring-danger/20'
                        : 'border-border',
                    ].join(' ')}
                  />
                </div>
                {errors.email ? <p className="text-xs text-danger">{errors.email}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-navy">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Votre mot de passe"
                    className={[
                      'w-full rounded-brand border bg-white py-2.5 pl-9 pr-10 text-sm text-navy',
                      'outline-none transition placeholder:text-muted/60',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20',
                      errors.password
                        ? 'border-danger focus:border-danger focus:ring-danger/20'
                        : 'border-border',
                    ].join(' ')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-navy"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? <p className="text-xs text-danger">{errors.password}</p> : null}
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="flex cursor-pointer items-center gap-2 select-none text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Se souvenir de moi
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary transition hover:text-primary/75"
                >
                  Mot de passe oublie ?
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={[
                  'flex w-full items-center justify-center gap-2 rounded-brand',
                  'bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm',
                  'transition hover:bg-[#a01024] active:scale-[0.98]',
                  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                ].join(' ')}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : isAdminSpace ? (
                  'Connexion administrateur'
                ) : (
                  'Connexion'
                )}
              </button>

              {isAdminSpace ? (
                <div className="rounded-brand border border-border bg-page px-4 py-3 text-sm text-muted">
                  Aucun parcours de demande d acces n est propose sur cet espace administrateur.
                </div>
              ) : (
                <p className="text-center text-sm text-muted">
                  Pas encore de compte ?{' '}
                  <Link
                    to={requestAccessPath}
                    className="font-semibold text-primary transition hover:text-primary/75"
                  >
                    Demander un acces
                  </Link>
                </p>
              )}
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          {new Date().getFullYear()} Attijari Bank Tunisia - Usage interne uniquement
        </p>
      </div>
    </div>
  );
}
