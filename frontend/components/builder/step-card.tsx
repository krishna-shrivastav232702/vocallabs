'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { STEP_TYPE_CONFIG, cn } from '@/lib/utils';
import type { DraftStep, OrgRole } from '@/lib/types';
import {
  GripVertical, Trash2, ChevronDown, ChevronUp,
  Sparkles, Globe, Database, Bell, GitBranch, ShieldCheck
} from 'lucide-react';
import { LlmCallForm } from './step-forms/llm-call-form';
import { HttpRequestForm } from './step-forms/http-request-form';
import { DbWriteForm } from './step-forms/db-write-form';
import { NotifyForm } from './step-forms/notify-form';
import { ConditionalBranchForm } from './step-forms/conditional-branch-form';
import { ApprovalGateForm } from './step-forms/approval-gate-form';

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, Globe, Database, Bell, GitBranch, ShieldCheck,
};

interface StepCardProps {
  step: DraftStep;
  index: number;
  totalSteps: number;
  isSelected: boolean;
  editable: boolean;
  role: OrgRole | undefined;
  onSelect: () => void;
  onRemove: () => void;
  onUpdate: (config: Record<string, unknown>) => void;
}

export function StepCard({
  step, index, totalSteps, isSelected, editable, role,
  onSelect, onRemove, onUpdate,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(false);

  const cfg = STEP_TYPE_CONFIG[step.step_type];
  const Icon = ICON_MAP[cfg.iconName] ?? Sparkles;

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: step._key, disabled: !editable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  function renderForm() {
    const props = {
      config: step.config as Record<string, unknown>,
      onChange: onUpdate,
      totalSteps,
      currentPosition: index,
      readOnly: !editable,
    };
    switch (step.step_type) {
      case 'llm_call': return <LlmCallForm {...props} />;
      case 'http_request': return <HttpRequestForm {...props} />;
      case 'db_write': return <DbWriteForm {...props} />;
      case 'notify': return <NotifyForm {...props} />;
      case 'conditional_branch': return <ConditionalBranchForm {...props} />;
      case 'approval_gate': return <ApprovalGateForm {...props} />;
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'surface rounded-xl overflow-hidden transition-all',
        isSelected && 'ring-2 ring-[var(--color-accent)] ring-offset-1',
        'ring-offset-[var(--color-bg)]',
      )}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-3 py-3 cursor-pointer select-none"
        onClick={() => { onSelect(); setExpanded((e) => !e); }}
        role="button"
        aria-expanded={expanded}
        aria-label={`${cfg.label} step — click to ${expanded ? 'collapse' : 'expand'}`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((x) => !x)}
      >
        {/* Drag handle — only visible for editors */}
        {editable && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors shrink-0 p-0.5 rounded"
            aria-label="Drag to reorder step"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {/* Step icon */}
        <div
          className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', cfg.bgClass)}
        >
          <Icon className={cn('w-3.5 h-3.5', cfg.accentClass)} />
        </div>

        {/* Step label + position */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
            {cfg.label}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Step {index + 1}
          </p>
        </div>

        {/* Expand / delete */}
        <div className="flex items-center gap-1">
          {editable && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1.5 rounded-lg hover:bg-[var(--color-failed-bg)] transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
              aria-label="Remove step"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
          )}
        </div>
      </div>

      {/* Config form */}
      {expanded && (
        <div
          className="px-4 pb-4 border-t"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="mt-3">{renderForm()}</div>
        </div>
      )}
    </div>
  );
}
