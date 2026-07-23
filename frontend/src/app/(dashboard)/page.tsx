import { Suspense } from 'react';
import TodayPlanWidget from '@/components/dashboard/TodayPlanWidget';
import ExamsWidget from '@/components/dashboard/ExamsWidget';
import PriorityWidget from '@/components/dashboard/PriorityWidget';
import QuickActions from '@/components/dashboard/QuickActions';
import { WidgetSkeleton } from '@/components/skeleton';

export default function DashboardPage() {
  return (
    <div className='grid grid-cols-12 gap-6 p-2 md:p-6'>
      <div className='col-span-12'>
        <QuickActions />
      </div>
      
      <div className='col-span-12 lg:col-span-8'>
        <Suspense fallback={<WidgetSkeleton />}>
          <TodayPlanWidget />
        </Suspense>
      </div>
      
      <div className='col-span-12 lg:col-span-4 space-y-6'>
        <Suspense fallback={<WidgetSkeleton />}>
          <ExamsWidget />
        </Suspense>
        
        <Suspense fallback={<WidgetSkeleton />}>
          <PriorityWidget />
        </Suspense>
      </div>
    </div>
  );
}
