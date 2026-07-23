import { MaterialsListSkeleton } from '@/components/skeleton/MaterialsListSkeleton';

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-9 w-44 bg-muted rounded-xl animate-pulse" />
      <MaterialsListSkeleton count={6} />
    </div>
  );
}
