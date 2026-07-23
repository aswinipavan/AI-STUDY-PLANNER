import { ChartSkeleton } from '@/components/skeleton/ChartSkeleton';

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-9 w-56 bg-muted rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
