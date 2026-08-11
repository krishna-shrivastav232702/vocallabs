import type { Metadata } from 'next';
import { BuilderCanvas } from '@/components/builder/builder-canvas';
import { notFound } from 'next/navigation';

interface WorkflowPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WorkflowPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Edit Workflow — ${id.slice(0, 8)}` };
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = await params;

  if (!id) notFound();

  return (
    <div className="h-full">
      <BuilderCanvas workflowId={id} />
    </div>
  );
}
