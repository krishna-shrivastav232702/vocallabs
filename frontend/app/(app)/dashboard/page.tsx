import type { Metadata } from 'next';
import { WorkflowList } from '@/components/dashboard/workflow-list';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your AI agent workflows',
};

// RSC shell — WorkflowList is a Client Component and handles its own data fetching.
// This page itself stays server-rendered; the data-fetching boundary is within the
// client component, so the skeleton shows immediately on navigation.
export default function DashboardPage() {
  return <WorkflowList />;
}
