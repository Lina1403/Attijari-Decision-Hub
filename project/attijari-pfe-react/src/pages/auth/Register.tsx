import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDefaultPathForRole } from '@/auth/rbac';
import { usePageTitle } from '@/hooks/usePageTitle';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function Register() {
  usePageTitle('Créer un compte');

  const navigate = useNavigate();
  const storeLogin = useAuthStore((state) => state.login);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = () => {
    const next: FormErrors = {};

    if (!firstName.trim()) next.firstName = 'Le prénom est requis.';
    if (!lastName.trim()) next.lastName = 'Le nom est requis.';
    if (!EMAIL_REGEX.test(email.trim())) next.email = 'Adresse e-mail invalide.';
    if (password.length < 6) next.password = 'Minimum 6 caractères.';
    if (password !== confirmPassword) {
      next.confirmPassword = 'Les mots de passe ne correspondent pas.';
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
      const { user, accessToken, refreshToken } = await authService.register(
        email.trim(),
        password,
        firstName.trim(),
        lastName.trim(),
      );
      storeLogin(user, { accessToken, refreshToken }, true);
      navigate(getDefaultPathForRole(user.role), { replace: true });
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Création du compte impossible.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-[#9b0c22] to-navy p-4">
      <div className="w-full max-w-[420px]">
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
                <span className="text-2xl font-extrabold tracking-tight text-white">AT</span>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-navy">Créer un compte</h1>
              <p className="mt-1 text-sm text-muted">Rejoignez Attijari Decision Hub</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="firstName" className="block text-sm font-semibold text-navy">
                    Prénom
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Lina"
                      className={[
                        'w-full rounded-brand border bg-white py-2.5 pl-9 pr-3 text-sm text-navy',
                        'outline-none transition placeholder:text-muted/60',
                        'focus:border-primary focus:ring-2 focus:ring-primary/20',
                        errors.firstName ? 'border-danger' : 'border-border',
                      ].join(' ')}
                    />
                  </div>
                  {errors.firstName ? <p className="text-xs text-danger">{errors.firstName}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lastName" className="block text-sm font-semibold text-navy">
                    Nom
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Ben Ali"
                      className={[
                        'w-full rounded-brand border bg-white py-2.5 pl-9 pr-3 text-sm text-navy',
                        'outline-none transition placeholder:text-muted/60',
                        'focus:border-primary focus:ring-2 focus:ring-primary/20',
                        errors.lastName ? 'border-danger' : 'border-border',
                      ].join(' ')}
                    />
                  </div>
                  {errors.lastName ? <p className="text-xs text-danger">{errors.lastName}</p> : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="block text-sm font-semibold text-navy">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="prenom.nom@attijari.tn"
                    className={[
                      'w-full rounded-brand border bg-white py-2.5 pl-9 pr-3 text-sm text-navy',
                      'outline-none transition placeholder:text-muted/60',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20',
                      errors.email ? 'border-danger' : 'border-border',
                    ].join(' ')}
                  />
                </div>
                {errors.email ? <p className="text-xs text-danger">{errors.email}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="block text-sm font-semibold text-navy">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 6 caractères"
                    className={[
                      'w-full rounded-brand border bg-white py-2.5 pl-9 pr-10 text-sm text-navy',
                      'outline-none transition placeholder:text-muted/60',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20',
                      errors.password ? 'border-danger' : 'border-border',
                    ].join(' ')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-navy"
                    aria-label="Afficher le mot de passe"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? <p className="text-xs text-danger">{errors.password}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block text-sm font-semibold text-navy">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Répétez le mot de passe"
                    className={[
                      'w-full rounded-brand border bg-white py-2.5 pl-9 pr-3 text-sm text-navy',
                      'outline-none transition placeholder:text-muted/60',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20',
                      errors.confirmPassword ? 'border-danger' : 'border-border',
                    ].join(' ')}
                  />
                </div>
                {errors.confirmPassword ? (
                  <p className="text-xs text-danger">{errors.confirmPassword}</p>
                ) : null}
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
                    Création en cours...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </button>

              <p className="text-center text-sm text-muted">
                Déjà un compte ?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-primary transition hover:text-primary/75"
                >
                  Se connecter
                </Link>
              </p>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Attijari Bank Tunisia - Usage interne uniquement
        </p>
      </div>
    </div>
  );
}
