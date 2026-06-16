import Badge from '@/components/ui/Badge';

interface RiskScoreBadgeProps {
  score: number;
}

function getRiskTone(score: number) {
  if (score >= 80) {
    return { tone: 'danger' as const, label: 'Critique' };
  }

  if (score >= 65) {
    return { tone: 'gold' as const, label: 'Eleve' };
  }

  return { tone: 'success' as const, label: 'Modere' };
}

export default function RiskScoreBadge({ score }: RiskScoreBadgeProps) {
  const risk = getRiskTone(score);
  return (
    <Badge tone={risk.tone}>
      {score} / 100 - {risk.label}
    </Badge>
  );
}
