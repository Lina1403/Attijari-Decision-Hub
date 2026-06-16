import { createHash } from 'node:crypto';
import {
  buildDashboardAiSummarySuccessResponse,
  validateStructuredSummary,
} from '../dto/dashboardAiSummaryDtos.js';
import { stableStringify } from '../utils/stableStringify.js';

export class DashboardAiSummaryService {
  constructor({ cache, contextBuilder, promptFactory, groqClient, logger, config }) {
    this.cache = cache;
    this.contextBuilder = contextBuilder;
    this.promptFactory = promptFactory;
    this.groqClient = groqClient;
    this.logger = logger;
    this.config = config;
  }

  createCacheKey(request) {
    return createHash('sha1')
      .update(
        stableStringify({
          dashboardType: request.dashboardType,
          filters: request.filters,
          model: this.config.groq.model,
          kpiSnapshot: request.kpiSnapshot,
        }),
      )
      .digest('hex');
  }

  async generate(request, { requestId } = {}) {
    const startedAt = Date.now();
    const cacheKey = this.createCacheKey(request);

    if (!request.options?.bypassCache) {
      const cachedResponse = this.cache.get(cacheKey);

      if (cachedResponse) {
        this.logger.info('Dashboard AI summary served from cache.', {
          requestId,
          dashboardType: request.dashboardType,
          cacheHit: true,
        });

        return {
          ...cachedResponse,
          meta: {
            ...cachedResponse.meta,
            cacheHit: true,
          },
        };
      }
    }

    const summaryContext = await this.contextBuilder.build({
      dashboardType: request.dashboardType,
      filters: request.filters,
      kpiSnapshot: request.kpiSnapshot,
    });
    const messages = this.promptFactory.createMessages({
      dashboardType: request.dashboardType,
      summaryContext,
    });
    const rawSummary = await this.groqClient.generateStructuredSummary(messages);
    const summary = validateStructuredSummary(rawSummary);

    const response = buildDashboardAiSummarySuccessResponse({
      dashboardType: request.dashboardType,
      generatedAt: new Date().toISOString(),
      summary,
      meta: {
        model: this.config.groq.model,
        cacheHit: false,
        provider: 'groq',
        filters: request.filters,
      },
    });

    this.cache.set(cacheKey, response);

    this.logger.info('Dashboard AI summary generated.', {
      requestId,
      dashboardType: request.dashboardType,
      durationMs: Date.now() - startedAt,
      cacheHit: false,
    });

    return response;
  }
}
