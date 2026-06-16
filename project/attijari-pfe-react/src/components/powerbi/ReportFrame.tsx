import { memo } from 'react';

interface ReportFrameProps {
  src: string;
  title: string;
  height?: number | string;
  isLoading?: boolean;
  onLoad?: () => void;
  className?: string;
}

function ReportFrameComponent({
  src,
  title,
  height = 800,
  isLoading = false,
  onLoad,
  className = '',
}: ReportFrameProps) {
  if (isLoading) {
    return (
      <div
        className={`dashboard-embed-frame bg-white ${className}`}
        style={{ height }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="space-y-4">
            <div className="h-8 w-64 animate-pulse rounded bg-navy/10" />
            <div className="h-[calc(100%-40px)] min-h-[250px] animate-pulse rounded-card bg-navy/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`dashboard-embed-frame bg-white ${className}`}
      style={{ height }}
    >
      <iframe
        title={title}
        src={src}
        frameBorder="0"
        className="h-full w-full"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        onLoad={onLoad}
      />
    </div>
  );
}

export const ReportFrame = memo(ReportFrameComponent);
export default ReportFrame;
