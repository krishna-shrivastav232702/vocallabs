import type { Metadata } from 'next';
import { BuilderCanvas } from '@/components/builder/builder-canvas';

export const metadata: Metadata = {
  title: 'New Workflow',
};

export default function NewWorkflowPage() {
  return (
    <div className="h-full">
      <BuilderCanvas />
    </div>
  );
}
