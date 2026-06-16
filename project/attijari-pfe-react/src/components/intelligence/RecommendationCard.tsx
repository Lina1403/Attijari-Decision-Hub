import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { StrategicRecommendation } from '@/types';
import { getRecommendationActionPath } from '@/utils/recommendations';

interface RecommendationCardProps {
  recommendation: StrategicRecommendation;
}

function getPriorityTone(priority: StrategicRecommendation['priority']) {
  if (priority === 'Haute') {
    return 'priorityHigh';
  }

  if (priority === 'Moyenne') {
    return 'priorityMedium';
  }

  return 'priorityLow';
}

function RecommendationCardComponent({ recommendation }: RecommendationCardProps) {
  const navigate = useNavigate();

  return (
    <article className="panel subtle-hover flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge tone={getPriorityTone(recommendation.priority)}>{recommendation.priority}</Badge>
          <h3 className="text-lg font-semibold text-navy">{recommendation.title}</h3>
        </div>
        <div className="rounded-brand bg-primary-soft px-3 py-2 text-right">
          <p className="text-xs uppercase tracking-wide text-muted">Impact</p>
          <p className="text-lg font-bold text-primary">{recommendation.impact}</p>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm leading-6 text-muted">{recommendation.description}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-brand bg-page p-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">ROI estime</p>
          <p className="mt-1 font-semibold text-navy">{recommendation.roi}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">ETA</p>
          <p className="mt-1 font-semibold text-navy">{recommendation.eta}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Categorie</p>
          <p className="mt-1 font-semibold text-navy">{recommendation.category}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Owner</p>
          <p className="mt-1 font-semibold text-navy">{recommendation.owner}</p>
        </div>
      </div>

      <Button
        className="mt-5 w-full"
        variant="primary"
        onClick={() => navigate(getRecommendationActionPath(recommendation))}
      >
        {recommendation.actionLabel}
      </Button>
    </article>
  );
}

const RecommendationCard = memo(RecommendationCardComponent);

export default RecommendationCard;
