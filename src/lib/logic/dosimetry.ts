import { type Duration, toDays, fromDays, calculateExecution, addDurations, subtractDuration } from './calculator';

export type OperationType = 'increase' | 'decrease';
export type OperationTarget = 'base' | 'current';

export interface DosimetryOperation {
    id: string;
    name: string;
    fractionValue: number;
    fractionLabel: string;
    type: OperationType;
    target: OperationTarget;
    result: Duration; // The amount calculated (e.g., 4 months)
}

export interface DosimetryPhase {
    base: Duration; // The starting value for this phase
    operations: DosimetryOperation[];
    result: Duration; // The final value of this phase
}

export interface DosimetryState {
    phase1: Duration; // Pena Base
    phase2: DosimetryPhase;
    phase3: DosimetryPhase;
}

export function calculateDosimetry(
    basePenalty: Duration,
    phase2Ops: Omit<DosimetryOperation, 'result'>[],
    phase3Ops: Omit<DosimetryOperation, 'result'>[]
): DosimetryState {
    
    // Phase 1
    const p1Result = { ...basePenalty };

    // Phase 2
    const p2OpsWithResult: DosimetryOperation[] = [];
    let p2CurrentDays = toDays(p1Result);
    const p2BaseDays = p2CurrentDays; // Base for Phase 2 is Phase 1 Result

    for (const op of phase2Ops) {
        const baseDays = op.target === 'base' ? p2BaseDays : p2CurrentDays;
        const amountDays = Math.floor(baseDays * op.fractionValue);
        const amount = fromDays(amountDays);
        
        if (op.type === 'increase') {
            p2CurrentDays += amountDays;
        } else {
            p2CurrentDays = Math.max(0, p2CurrentDays - amountDays);
        }

        p2OpsWithResult.push({
            ...op,
            result: amount
        });
    }
    const p2Result = fromDays(p2CurrentDays);

    // Phase 3
    const p3OpsWithResult: DosimetryOperation[] = [];
    let p3CurrentDays = p2CurrentDays;
    const p3BaseDays = p3CurrentDays; // Base for Phase 3 is Phase 2 Result

    for (const op of phase3Ops) {
        const baseDays = op.target === 'base' ? p3BaseDays : p3CurrentDays;
        const amountDays = Math.floor(baseDays * op.fractionValue);
        const amount = fromDays(amountDays);
        
        if (op.type === 'increase') {
            p3CurrentDays += amountDays;
        } else {
            p3CurrentDays = Math.max(0, p3CurrentDays - amountDays);
        }

        p3OpsWithResult.push({
            ...op,
            result: amount
        });
    }
    const p3Result = fromDays(p3CurrentDays);

    return {
        phase1: p1Result,
        phase2: {
            base: p1Result,
            operations: p2OpsWithResult,
            result: p2Result
        },
        phase3: {
            base: p2Result,
            operations: p3OpsWithResult,
            result: p3Result
        }
    };
}
