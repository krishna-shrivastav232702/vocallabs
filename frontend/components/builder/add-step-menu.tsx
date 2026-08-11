'use client';

import { useState } from 'react';
import { STEP_TYPE_CONFIG, canEdit, isOwner } from '@/lib/utils';
import { EDITOR_RESTRICTED_STEP_TYPES } from '@/lib/types';
import type { StepType, OrgRole } from '@/lib/types';
import {
  Plus, Sparkles, Globe, Database, Bell, GitBranch, ShieldCheck
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, Globe, Database, Bell, GitBranch, ShieldCheck,
};

interface AddStepMenuProps {
  onAdd: (type: StepType) => void;
  role: OrgRole | undefined;
}

export function AddStepMenu({ onAdd, role }: AddStepMenuProps) {
  const [open, setOpen] = useState(false);

  const ALL_TYPES = Object.keys(STEP_TYPE_CONFIG) as StepType[];

  // Editors cannot see db_write/notify options at all (not just disabled)
  // — backend enforces this at both layers, this is the UX courtesy
  const availableTypes = ALL_TYPES.filter((t) => {
    if (EDITOR_RESTRICTED_STEP_TYPES.includes(t) && !isOwner(role)) return false;
    return true;
  });

  return (
    <div className="relative mt-1">
      <button
        id="add-step"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border-2 border-dashed transition-all hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-subtle)]"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-tertiary)',
        }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Add step"
      >
        <Plus className="w-4 h-4" />
        Add step
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-2 w-full rounded-xl z-20 py-1.5 shadow-xl"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-lg)',
            }}
            role="menu"
          >
            <p
              className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Choose step type
            </p>
            {availableTypes.map((type) => {
              const cfg = STEP_TYPE_CONFIG[type];
              const Icon = ICON_MAP[cfg.iconName] ?? Plus;
              return (
                <button
                  key={type}
                  role="menuitem"
                  onClick={() => { onAdd(type); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bgClass}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.accentClass}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {cfg.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {cfg.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
