import CompanionChat from '@/components/CompanionChat';

type PageProps = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params;
  return <CompanionChat conversationId={id} />;
}
