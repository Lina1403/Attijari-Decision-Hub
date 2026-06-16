import { ArrowLeft, Building2, Mail, Send, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getSpaceLabel } from '@/auth/labels';
import { usePageTitle } from '@/hooks/usePageTitle';
import { accessRequestService } from '@/services/accessRequestService';

type RequestedRole = 'MARKETING' | 'COMMERCIAL';

interface FormState {
  fullName: string;
  email: string;
  requestedRole: RequestedRole;
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RequestAccess() {
  usePageTitle("Demande d'acces");

  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('space') === 'commercial' ? 'COMMERCIAL' : 'MARKETING';

  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    requestedRole: initialRole,
    message: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedSpace =
    form.requestedRole === 'COMMERCIAL' ? getSpaceLabel('commercial') : getSpaceLabel('marketing');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!form.fullName.trim() || !EMAIL_REGEX.test(form.email.trim())) {
      setError('Renseignez un nom complet et une adresse e-mail professionnelle valides.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await accessRequestService.createRequest({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        requestedRole: form.requestedRole,
        message: form.message.trim(),
      });

      setSuccessMessage(response.message);
      setForm((current) => ({
        ...current,
        fullName: '',
        email: '',
        message: '',
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-2xl rounded-card border border-border bg-white p-6 shadow-sm sm:p-8">
        <Link
          to="/choose-space"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au choix de l espace
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            Acces utilisateur
          </p>
          <h1 className="mt-2 text-3xl font-bold text-navy">Demander un acces</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            La demande sera envoyee a l administrateur. L espace selectionne est actuellement :
            <span className="ml-1 font-semibold text-navy">{selectedSpace}</span>.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <Input
            label="Nom complet"
            name="full-name"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            placeholder="Nom Prenom"
            leftIcon={<UserRound className="h-4 w-4" />}
            required
          />

          <Input
            label="Email professionnel"
            type="email"
            name="business-email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="prenom.nom@attijari.tn"
            leftIcon={<Mail className="h-4 w-4" />}
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-navy">
              Direction demandee
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { role: 'MARKETING' as const, label: 'Direction Marketing' },
                { role: 'COMMERCIAL' as const, label: 'Direction Marche' },
              ].map((option) => (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, requestedRole: option.role }))}
                  className={[
                    'flex items-center gap-3 rounded-brand border px-4 py-3 text-left transition',
                    form.requestedRole === option.role
                      ? 'border-primary bg-primary/5 text-navy'
                      : 'border-border bg-white text-muted hover:border-primary/30',
                  ].join(' ')}
                >
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="access-message" className="block text-sm font-semibold text-navy">
              Message optionnel
            </label>
            <textarea
              id="access-message"
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Contexte ou besoin specifique si necessaire."
              rows={4}
              className="w-full rounded-brand border border-border bg-white px-3 py-3 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {error ? (
            <div className="rounded-brand border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-brand border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
              {successMessage}
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={submitting}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Envoyer la demande
          </Button>
        </form>
      </div>
    </div>
  );
}
