import { ArrowRight, BriefcaseBusiness, Megaphone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSpaceDescription, getSpaceLabel } from '@/auth/labels';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { AccessSpace } from '@/types';

const spaces: Array<{
  id: AccessSpace;
  title: string;
  description: string;
  accent: string;
  icon: typeof Megaphone;
  loginPath: string;
  requestPath?: string;
}> = [
  {
    id: 'marketing',
    title: getSpaceLabel('marketing'),
    description: getSpaceDescription('marketing'),
    accent: 'from-[#B5122B] to-[#FF6A7E]',
    icon: Megaphone,
    loginPath: '/login?space=marketing',
    requestPath: '/request-access?space=marketing',
  },
  {
    id: 'commercial',
    title: getSpaceLabel('commercial'),
    description: getSpaceDescription('commercial'),
    accent: 'from-[#143B6B] to-[#2C6AA8]',
    icon: BriefcaseBusiness,
    loginPath: '/login?space=commercial',
    requestPath: '/request-access?space=commercial',
  },
  {
    id: 'admin',
    title: getSpaceLabel('admin'),
    description: getSpaceDescription('admin'),
    accent: 'from-[#3A1022] to-[#7C173D]',
    icon: ShieldCheck,
    loginPath: '/login/admin',
  },
];

export default function ChooseSpace() {
  usePageTitle('Choix de l espace');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(181,18,43,0.18),_transparent_40%),linear-gradient(180deg,_#F6F1F1_0%,_#FFFFFF_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-card bg-primary shadow-lg shadow-primary/20">
            <span className="text-2xl font-extrabold tracking-tight text-white">AT</span>
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
            Attijari Decision Hub
          </p>
          <h1 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">
            Choisissez votre espace de connexion
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            L utilisateur choisit son point d entree, mais le role final reste determine par son
            compte valide dans la base SQL Server.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {spaces.map((space) => {
            const Icon = space.icon;

            return (
              <section
                key={space.id}
                className="flex h-full flex-col rounded-card border border-border bg-white p-6 shadow-sm"
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${space.accent} text-white shadow-lg`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <h2 className="text-xl font-bold text-navy">{space.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted">{space.description}</p>

                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    to={space.loginPath}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-brand bg-primary px-5 text-[15px] font-semibold text-white shadow-sm shadow-primary/20 transition hover:bg-[#a01024]"
                  >
                    <span>Ouvrir cet espace</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  {space.requestPath ? (
                    <Link
                      to={space.requestPath}
                      className="inline-flex h-12 w-full items-center justify-center rounded-brand border border-border bg-white px-5 text-[15px] font-semibold text-navy shadow-sm transition hover:border-primary/40 hover:bg-page hover:text-primary"
                    >
                      Demander un acces
                    </Link>
                  ) : (
                    <div className="rounded-brand border border-border bg-page px-4 py-3 text-sm text-muted">
                      La connexion administrateur est reservee aux comptes deja autorises.
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
