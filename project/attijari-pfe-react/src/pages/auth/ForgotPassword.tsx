import { ArrowLeft, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { usePageTitle } from '@/hooks/usePageTitle';
import { authService } from '@/services/authService';

export default function ForgotPassword() {
  usePageTitle('Mot de passe oublié');

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError('');
      setTemporaryPassword('');
      const response = await authService.requestPasswordReset(email);
      setMessage(response.message);
      setTemporaryPassword(response.credentialsPreview?.temporaryPassword ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opération indisponible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-6">
      <div className="w-full max-w-lg rounded-card border border-border bg-white p-6 sm:p-8">
        <Link
          to="/choose-space"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au choix de l espace
        </Link>

        <div className="mt-6 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            Récupération
          </p>
          <h1 className="text-3xl font-bold text-navy">Mot de passe oublié</h1>
          <p className="text-sm leading-6 text-muted">
            Saisissez votre adresse professionnelle pour recevoir le lien de
            reinitialisation de demonstration.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <Input
            label="Adresse e-mail"
            type="email"
            name="forgot-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@attijari.tn"
            leftIcon={<Mail className="h-4 w-4" />}
            error={error}
          />

          {message ? (
            <div className="rounded-brand border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
              {message}
              {temporaryPassword ? (
                <p className="mt-2 font-mono text-sm font-semibold text-primary">
                  Mot de passe temporaire : {temporaryPassword}
                </p>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" className="w-full" size="lg" isLoading={submitting}>
            Envoyer le lien
          </Button>
        </form>
      </div>
    </div>
  );
}
