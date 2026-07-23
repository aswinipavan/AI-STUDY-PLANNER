// Route-level skeleton for subjects page
import { SubjectGridSkeleton } from '@/components/skeleton/SubjectGridSkeleton';

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-9 w-48 bg-muted rounded-xl animate-pulse" />
      <SubjectGridSkeleton count={6} />
    </div>
  );
}
