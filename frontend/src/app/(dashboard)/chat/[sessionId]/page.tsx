import ChatContainer from '@/components/chat/ChatContainer';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function ActiveChatPage({ params }: Props) {
  const { sessionId } = await params;
  return <ChatContainer initialSessionId={sessionId} />;
}
