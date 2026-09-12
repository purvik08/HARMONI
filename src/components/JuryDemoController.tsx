'use client';

import React from 'react';
import type { JuryDemoStage } from '../hooks/useSimWorker';
import { JURY_DEMO_STAGES } from '../hooks/useSimWorker';

interface JuryDemoControllerProps {
  isRunning: boolean;
  isJuryDemoRunning: boolean;
  stageIndex: number;
  secRemaining: number;
  currentStage?: JuryDemoStage;
  onRunJuryDemo: () => void;
  onStopJuryDemo: () => void;
}

export function JuryDemoController({
  isJuryDemoRunning,
  stageIndex,
  secRemaining,
  currentStage,
  onRunJuryDemo,
  onStopJuryDemo,
}: JuryDemoControllerProps) {
  const totalStages = JURY_DEMO_STAGES.length;
  const progressPct = ((stageIndex + (1 - secRemaining / (currentStage?.durationSec || 1))) / totalStages) * 100;

  return (
    <div className="bg-[#0f1513] border-2 border-[#4fc6c0]/40 rounded-xl p-3 flex flex-col gap-2.5 shadow-[0_0_20px_rgba(79,198,192,0.12)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#22302b]">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-[#4fc6c0] shadow-[0_0_10px_#4fc6c0] animate-pulse" />
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[#4fc6c0]">
              Jury Demonstration Orchestrator
            </h3>
            <p className="text-[10px] text-[#7d918a]">
              Automated 6-stage operational test verifying decentralized fleet invariants in real time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isJuryDemoRunning ? (
            <button
              onClick={onStopJuryDemo}
              className="px-3.5 py-1.5 bg-[#e3595a] hover:bg-[#c94a4b] text-white rounded-md font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(227,89,90,0.4)]"
            >
              ❚❚ STOP DEMO
            </button>
          ) : (
            <button
              onClick={onRunJuryDemo}
              className="px-4 py-1.5 bg-[#4fc6c0] hover:bg-[#3fb6b0] text-[#0d1210] rounded-md font-mono text-xs font-extrabold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(79,198,192,0.5)] animate-pulse"
            >
              ▶ RUN JURY DEMO (1-Click Tour)
            </button>
          )}
        </div>
      </div>

      {isJuryDemoRunning && currentStage ? (
        <div className="flex flex-col gap-2">
          {/* Progress Bar */}
          <div className="w-full bg-[#131a17] h-2 rounded-full overflow-hidden border border-[#22302b]">
            <div
              className="bg-gradient-to-r from-[#4fc6c0] to-[#5fbf7a] h-full transition-all duration-300 shadow-[0_0_8px_#4fc6c0]"
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>

          {/* Current Stage Card */}
          <div className="bg-[#131a17] border border-[#4fc6c0]/30 rounded-lg p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#4fc6c0]">
                {currentStage.name}
              </span>
              <span className="text-[11px] font-mono text-[#e0a63a] font-bold">
                {secRemaining}s remaining
              </span>
            </div>

            <p className="text-xs text-[#dfe8e3]">
              {currentStage.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-[#22302b] text-[11px] font-mono">
              <div className="flex items-start gap-1.5 text-[#5fbf7a]">
                <span className="text-[#7d918a]">Target:</span>
                <span>{currentStage.targetBehavior}</span>
              </div>
              <div className="flex items-start gap-1.5 text-[#4fc6c0]">
                <span className="text-[#7d918a]">Jury Proof:</span>
                <span>{currentStage.juryTakeaway}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] font-mono text-[#7d918a] bg-[#131a17] px-3 py-1.5 rounded border border-[#22302b]">
          <span>Ready to demonstrate: Dispatch → P2P Conflict → Deadlock Break → WMS Loss → P2P Loss → Benchmark</span>
          <span className="text-[#4fc6c0]">Click "▶ RUN JURY DEMO" to start</span>
        </div>
      )}
    </div>
  );
}
