import JournalPanel from '@/components/JournalPanel';

type PageProps = { params: Promise<{ id: string }> };

export default async function JournalEntryPage({ params }: PageProps) {
  const { id } = await params;
  return <JournalPanel entryId={id} />;
}
