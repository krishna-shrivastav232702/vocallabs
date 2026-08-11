'use client';

import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'urql';
import { toast } from 'sonner';
import { SAVE_WORKFLOW, TRIGGER_WORKFLOW_RUN } from '@/lib/graphql/mutations';
import { GET_WORKFLOW } from '@/lib/graphql/queries';
import { StepCard } from './step-card';
import { AddStepMenu } from './add-step-menu';
import { TriggerPanel } from './trigger-panel';
import { BuilderSkeleton } from '@/components/skeletons/builder-skeleton';
import { useOrgContext } from '@/components/providers/org-context';
import { canEdit } from '@/lib/utils';
import type { DraftStep, StepType, TriggerType, WorkflowTrigger } from '@/lib/types';
import { generateKey } from '@/lib/utils';
import { Save, Play, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BuilderCanvasProps {
  workflowId?: string; // undefined = new workflow
}

function getDefaultConfig(type: StepType): Record<string, unknown> {
  switch (type) {
    case 'llm_call':
      return { model: 'llama-3.3-70b-versatile', prompt_template: '', temperature: 0.7, max_tokens: 1024 };
    case 'http_request':
      return { url: '', method: 'GET', headers: {}, body: '' };
    case 'db_write':
      return { table: '', operation: 'insert', data: {} };
    case 'notify':
      return { message: '' };
    case 'conditional_branch':
      return { condition: { field: '', operator: 'eq', value: '' }, true_target_position: 0, false_target_position: 0 };
    case 'approval_gate':
      return { approver_note: '' };
  }
}

export function BuilderCanvas({ workflowId }: BuilderCanvasProps) {
  const router = useRouter();
  const { orgId, role } = useOrgContext();
  const editable = canEdit(role);

  // Load existing workflow if editing
  const [{ data: wfData, fetching: wfFetching }] = useQuery({
    query: GET_WORKFLOW,
    variables: { id: workflowId },
    pause: !workflowId,
  });

  const existingWorkflow = wfData?.workflows_by_pk;

  // Local draft state — optimistic, mutated before any network round-trip
  const [name, setName] = useState<string>(() => existingWorkflow?.name ?? 'Untitled workflow');
  const [steps, setSteps] = useState<DraftStep[]>(() =>
    (existingWorkflow?.steps ?? []).map((s: typeof existingWorkflow.steps[0]) => ({
      ...s,
      _key: s.id ?? generateKey(),
    }))
  );
  const [triggers, setTriggers] = useState<Partial<WorkflowTrigger>[]>(() =>
    existingWorkflow?.workflow_triggers ?? []
  );
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [, saveWorkflow] = useMutation(SAVE_WORKFLOW);
  const [, triggerRun] = useMutation(TRIGGER_WORKFLOW_RUN);

  // Initialize steps/name once existing workflow loads
  const initialized = useRef(false);
  if (existingWorkflow && !initialized.current) {
    initialized.current = true;
    setName(existingWorkflow.name);
    setSteps(
      (existingWorkflow.steps ?? []).map((s: typeof existingWorkflow.steps[0]) => ({
        ...s,
        _key: s.id ?? generateKey(),
      }))
    );
    setTriggers(existingWorkflow.workflow_triggers ?? []);
  }

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setSteps((prev) => {
        const oldIndex = prev.findIndex((s) => s._key === active.id);
        const newIndex = prev.findIndex((s) => s._key === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex).map((s, i) => ({
          ...s,
          position: i,
        }));
        return reordered;
      });
      setSaveState('idle');
    },
    []
  );

  const addStep = useCallback((type: StepType) => {
    const newStep: DraftStep = {
      _key: generateKey(),
      step_type: type,
      position: steps.length,
      config: getDefaultConfig(type) as DraftStep['config'],
    };
    setSteps((prev) => [...prev, newStep]);
    setSelectedStepKey(newStep._key);
    setSaveState('idle');
  }, [steps.length]);

  const removeStep = useCallback((key: string) => {
    setSteps((prev) =>
      prev.filter((s) => s._key !== key).map((s, i) => ({ ...s, position: i }))
    );
    setSelectedStepKey(null);
    setSaveState('idle');
  }, []);

  const updateStep = useCallback((key: string, config: Record<string, unknown>) => {
    setSteps((prev) =>
      prev.map((s) => (s._key === key ? { ...s, config: config as DraftStep['config'] } : s))
    );
    setSaveState('idle');
    // Debounced autosave indicator
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, []);

  async function handleSave() {
    if (!editable) return;
    setSaveState('saving');

    const savedId = workflowId ?? undefined;
    const result = await saveWorkflow({
      workflow_id: savedId,
      org_id: existingWorkflow?.org_id ?? orgId,
      name,
      steps: steps.map((s, i) => ({
        id: s.id,
        step_type: s.step_type,
        position: i,
        config: s.config,
      })),
      triggers: triggers
        .filter((t) => t.trigger_type !== 'webhook')
        .map((t) => ({
          id: t.id,
          trigger_type: t.trigger_type as Exclude<TriggerType, 'webhook'>,
          config: t.config ?? {},
          enabled: t.enabled ?? true,
        })),
    });

    if (result.error) {
      setSaveState('error');
      toast.error(`Save failed: ${result.error.message}`);
    } else {
      setSaveState('saved');
      toast.success('Workflow saved');
      const newId = result.data?.saveWorkflow?.workflow_id;
      if (newId && !workflowId) {
        router.replace(`/workflows/${newId}`);
      }
    }
  }

  async function handleRun() {
    if (!editable || !workflowId) return;
    const result = await triggerRun({ workflow_id: workflowId });
    if (result.error) {
      toast.error(`Failed to start run: ${result.error.message}`);
      return;
    }
    const runId = result.data?.triggerWorkflowRun?.workflow_run_id;
    if (runId) {
      router.push(`/workflows/${workflowId}/runs/${runId}`);
    }
  }

  if (workflowId && wfFetching) return <BuilderSkeleton />;

  return (
    <div className="flex flex-col h-full">
      {/* Builder toolbar */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b shrink-0"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {editable ? (
          <input
            id="workflow-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaveState('idle'); }}
            className="flex-1 min-w-0 font-semibold text-base bg-transparent focus:outline-none"
            style={{ color: 'var(--color-text-primary)' }}
            placeholder="Workflow name"
            aria-label="Workflow name"
          />
        ) : (
          <h1
            className="flex-1 font-semibold text-base truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {name}
          </h1>
        )}

        {!editable && (
          <span
            className="text-xs px-2.5 py-1 rounded-lg font-medium"
            style={{
              color: 'var(--color-text-tertiary)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            Read-only view
          </span>
        )}

        {/* Save state indicator */}
        {editable && (
          <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {saveState === 'saving' && <>Saving…</>}
            {saveState === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-completed)' }} />
                Saved
              </>
            )}
            {saveState === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-failed)' }} />
                Save failed
              </>
            )}
          </span>
        )}

        {editable && (
          <button
            id="save-workflow"
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            aria-label="Save workflow"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
        )}

        {/* Run button — hidden for viewers entirely, not just disabled */}
        {editable && workflowId && (
          <button
            id="run-workflow"
            onClick={handleRun}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
            aria-label="Run workflow"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Run
          </button>
        )}
      </div>

      {/* Builder body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Step list */}
        <div className="flex-1 overflow-y-auto p-5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => {
              if (!editable) e.active.data.current = { ...e.active.data.current, disabled: true };
            }}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={steps.map((s) => s._key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2 max-w-2xl mx-auto">
                {steps.length === 0 && (
                  <div
                    className="text-center py-16 rounded-xl border-2 border-dashed"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
                  >
                    <p className="text-sm">
                      {editable ? 'Add your first step below' : 'No steps in this workflow'}
                    </p>
                  </div>
                )}

                {steps.map((step, index) => (
                  <StepCard
                    key={step._key}
                    step={step}
                    index={index}
                    totalSteps={steps.length}
                    isSelected={selectedStepKey === step._key}
                    editable={editable}
                    role={role}
                    onSelect={() => setSelectedStepKey(step._key)}
                    onRemove={() => removeStep(step._key)}
                    onUpdate={(config) => updateStep(step._key, config)}
                  />
                ))}

                {editable && (
                  <AddStepMenu onAdd={addStep} role={role} />
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: Trigger panel */}
        <div
          className="w-72 border-l overflow-y-auto shrink-0 p-4"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <TriggerPanel
            workflowId={workflowId}
            triggers={triggers as WorkflowTrigger[]}
            onTriggersChange={setTriggers}
            editable={editable}
            role={role}
          />
        </div>
      </div>
    </div>
  );
}
