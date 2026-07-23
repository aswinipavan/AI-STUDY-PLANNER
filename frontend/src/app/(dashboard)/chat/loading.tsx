import { ChatHistorySkeleton } from '@/components/skeleton/ChatHistorySkeleton';

export default function Loading() {
  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border bg-card/50 animate-pulse hidden md:block" />
      <div className="flex-1">
        <ChatHistorySkeleton />
      </div>
    </div>
  );
}
