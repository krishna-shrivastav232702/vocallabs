import type { Metadata } from 'next';
import { RunView } from '@/components/run-view/run-view';
import { notFound } from 'next/navigation';

interface RunPageProps {
  params: Promise<{ id: string; runId: string }>;
}

export async function generateMetadata({ params }: RunPageProps): Promise<Metadata> {
  const { runId } = await params;
  return { title: `Run ${runId.slice(0, 8)} — Live` };
}

export default async function RunPage({ params }: RunPageProps) {
  const { id, runId } = await params;

  if (!id || !runId) notFound();

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <RunView workflowRunId={runId} workflowName="Workflow Run" />
    </div>
  );
}
