'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { api } from '../../lib/api';

export default function UsageMeter() {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/billing/usage');
        if (res.success) setUsage(res.data);
      } catch {
        // Silent — meter is non-blocking
      }
    })();
  }, []);

  if (!usage) return null;

  const { aiCalls } = usage.usage;
  const pct = Math.min(100, aiCalls.percentage || 0);
  const critical = pct >= 90;
  const warning = pct >= 80;
  const barColor = critical ? 'bg-danger' : warning ? 'bg-warning' : 'bg-primary';

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-2xs font-semibold text-muted uppercase tracking-wider">
          {usage.plan.isTrialing ? 'Trial leads' : 'Lead usage'}
        </p>
        <span className="text-2xs font-medium tabular-nums text-foreground">
          {aiCalls.used} / {aiCalls.limit}
        </span>
      </div>
      <div className="w-full bg-muted-surface h-1.5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {aiCalls.inOverage && aiCalls.overageAmountPending > 0 && (
        <p className="text-2xs text-muted mt-1.5">
          Overage pending: ₹{aiCalls.overageAmountPending.toLocaleString('en-IN')}
        </p>
      )}
      {(warning || usage.upgradePrompt) && (
        <Link
          href="/dashboard/settings?tab=billing"
          className={`mt-2 flex items-center gap-1.5 text-2xs font-medium rounded-md px-2 py-1.5 ${
            critical ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'
          }`}
        >
          {critical ? <AlertTriangle className="w-3 h-3" /> : null}
          {usage.upgradePrompt?.message || 'Approaching plan limit — review billing'}
          <ArrowUpRight className="w-3 h-3 ml-auto shrink-0" />
        </Link>
      )}
    </div>
  );
}
