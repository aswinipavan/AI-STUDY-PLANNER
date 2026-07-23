import { TimetableGridSkeleton } from '@/components/skeleton/TimetableGridSkeleton';

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-9 w-40 bg-muted rounded-xl animate-pulse" />
      <TimetableGridSkeleton />
    </div>
  );
}
