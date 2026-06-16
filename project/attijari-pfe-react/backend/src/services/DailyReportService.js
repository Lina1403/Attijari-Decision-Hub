import { accountStore } from '../auth/accountStore.js';

const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

function formatMetricValue(metric) {
  const value = formatter.format(Number(metric.value ?? 0));
  const suffixes = {
    count: '',
    pct: ' %',
    usd: ' USD',
    score: '',
    days: ' jour(s)',
  };
  return `${value}${suffixes[metric.unit] ?? ''}`;
}

function buildReportDefinition(role, contexts) {
  const normalizedRole = String(role ?? '').toUpperCase();

  if (normalizedRole === 'MARKETING') {
    return {
      title: 'Synthese marketing et social media',
      metrics: [...contexts.campaigns.kpis.slice(0, 4), ...contexts.social.kpis.slice(0, 2)],
    };
  }

  if (normalizedRole === 'COMMERCIAL') {
    return {
      title: 'Synthese commerciale et qualite de service',
      metrics: [...contexts.overview.kpis.slice(0, 3), ...contexts.complaints.kpis.slice(0, 2)],
    };
  }

  return {
    title: 'Synthese decisionnelle globale',
    metrics: contexts.overview.kpis,
  };
}

export class DailyReportService {
  constructor({ sqlUserStore, dashboardDataService, emailService, logger }) {
    this.sqlUserStore = sqlUserStore;
    this.dashboardDataService = dashboardDataService;
    this.emailService = emailService;
    this.logger = logger;
  }

  async buildContexts() {
    const [overview, campaigns, complaints, social] = await Promise.all([
      this.dashboardDataService.buildSummaryContext({ dashboardType: 'overview' }),
      this.dashboardDataService.buildSummaryContext({ dashboardType: 'campaigns' }),
      this.dashboardDataService.buildSummaryContext({ dashboardType: 'complaints' }),
      this.dashboardDataService.buildSummaryContext({ dashboardType: 'social' }),
    ]);

    return { overview, campaigns, complaints, social };
  }

  async sendAll() {
    const users = await this.sqlUserStore.listUsers();
    const contexts = await this.buildContexts();
    const dateLabel = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
    }).format(new Date());
    const results = [];

    for (const user of users) {
      const preferences = accountStore.getPreferences(user.id, user);
      if (!preferences.notifications.emailEnabled) {
        results.push({ email: user.email, delivered: false, skipped: 'EMAIL_DISABLED' });
        continue;
      }

      const definition = buildReportDefinition(user.role, contexts);
      const delivery = await this.emailService.sendDailyReportEmail({
        fullName: user.fullName || user.email,
        email: user.email,
        dateLabel,
        title: definition.title,
        metrics: definition.metrics.map((item) => ({
          label: item.label,
          value: formatMetricValue(item),
        })),
      });

      results.push({
        email: user.email,
        role: user.role,
        delivered: delivery.delivered,
        mode: delivery.mode,
        error: delivery.error,
      });
    }

    this.logger?.info?.('Daily reports processed.', {
      recipients: results.length,
      delivered: results.filter((result) => result.delivered).length,
    });

    return results;
  }
}

export class DailyReportScheduler {
  constructor({ service, config, logger }) {
    this.service = service;
    this.config = config;
    this.logger = logger;
    this.timer = null;
    this.lastRunDate = '';
  }

  start() {
    if (!this.config.enabled || this.timer) {
      return;
    }

    this.timer = setInterval(() => this.tick(), 60_000);
    this.timer.unref?.();
    this.logger?.info?.('Daily report scheduler enabled.', {
      hour: this.config.hour,
      minute: this.config.minute,
    });
  }

  async tick() {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);

    if (
      now.getHours() !== this.config.hour ||
      now.getMinutes() !== this.config.minute ||
      this.lastRunDate === dateKey
    ) {
      return;
    }

    this.lastRunDate = dateKey;
    try {
      await this.service.sendAll();
    } catch (error) {
      this.logger?.error?.('Daily report scheduler failed.', { message: error?.message });
    }
  }
}
