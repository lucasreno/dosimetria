<script lang="ts">
  import {
    type Duration,
    type CalculationItem,
    calculateExecution,
    fractionOptions,
    formatDuration,
    generateReport,
    subtractDuration,
    toDays,
    fromDays,
    progressionOptions,
    calculateDate,
    calculateEndDate
  } from '$lib/logic/calculator';
  import {
    calculateDosimetry,
    type DosimetryOperation
  } from '$lib/logic/dosimetry';
  import {
    type MinimumWage,
    getMinimumWage,
    calculateFine,
    fineFractions
  } from '$lib/logic/fine';

    // Svelte 5 Runes
    let activeTab = $state<'execution' | 'fine' | 'remission' | 'dosimetry'>('dosimetry');
  let copied = $state(false);

        const tabOrder = ['dosimetry', 'execution', 'fine', 'remission'] as const;
    type TabKey = (typeof tabOrder)[number];
    const tabIndexByKey = new Map<TabKey, number>(tabOrder.map((k, i) => [k, i]));
    let tabButtons = $state<Record<TabKey, HTMLButtonElement | null>>({
        execution: null,
        dosimetry: null,
        fine: null,
        remission: null
    });

    function setActiveTab(next: TabKey) {
        activeTab = next;
    }

    function formatISODatePtBR(iso: string): string {
        if (!iso) return '';
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('pt-BR');
    }

    function formatNowPtBR(): string {
        return new Date().toLocaleString('pt-BR');
    }

    function buildExecutionReport(): string {
        const progressionDateStr = execProgressionDate ? execProgressionDate.toLocaleDateString('pt-BR') : 'N/A';
        const paroleDateStr = execParoleDate ? execParoleDate.toLocaleDateString('pt-BR') : 'N/A';
        const endDateStr = execEndDate ? execEndDate.toLocaleDateString('pt-BR') : 'N/A';

        const progressionLabel = progressionOptions.find(p => p.value === execProgressionFraction)?.label ?? `${Math.round(execProgressionFraction * 100)}%`;
        const paroleLabel = fractionOptions.find(f => f.value === execParoleFraction)?.label ?? `${execParoleFraction}`;

        const totalDays = execTotalDays;
        const deductedDays = execRemissionDays + execDetractionDays;
        const requiredProgressionDays = Math.ceil(totalDays * execProgressionFraction);
        const requiredParoleDays = Math.ceil(totalDays * execParoleFraction);
        const daysToServeProgression = Math.max(0, requiredProgressionDays - deductedDays);
        const daysToServeParole = Math.max(0, requiredParoleDays - deductedDays);
        const daysToServeEnd = Math.max(0, totalDays - deductedDays);

        return [
            'RELATÓRIO - EXECUÇÃO PENAL',
            `Gerado em: ${formatNowPtBR()}`,
            '----------------------------------------',
            `Pena total: ${execYears}a ${execMonths}m ${execDays}d (${totalDays} dias)`,
            `Data-base: ${formatISODatePtBR(execBaseDate)}`,
            `Deduções: Remição ${execRemissionDays}d · Detração ${execDetractionDays}d · Total ${deductedDays}d`,
            '----------------------------------------',
            `Progressão (${progressionLabel})`,
            `Requisito: ${requiredProgressionDays}d · A cumprir: ${daysToServeProgression}d`,
            `Data: ${progressionDateStr}`,
            '----------------------------------------',
            `Livramento Condicional (${paroleLabel})`,
            `Requisito: ${requiredParoleDays}d · A cumprir: ${daysToServeParole}d`,
            `Data: ${paroleDateStr}`,
            '----------------------------------------',
            'Término de Pena (TCP)',
            `A cumprir: ${daysToServeEnd}d`,
            `Data: ${endDateStr}`
        ].join('\n');
    }

    function buildFineReport(): string {
        const wage = currentWage?.value ?? 0;
        const fractionLabel = fineFractions.find(f => f.value === fineFractionValue)?.label ?? `${fineFractionValue}`;
        const unitValue = wage * fineFractionValue;
        return [
            'RELATÓRIO - DIAS-MULTA',
            `Gerado em: ${formatNowPtBR()}`,
            '----------------------------------------',
            `Data do fato: ${formatISODatePtBR(fineDate)}`,
            `Salário mínimo: R$ ${wage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `Base legal: ${currentWage?.law ?? 'N/A'}`,
            '----------------------------------------',
            `Dias-multa: ${fineDays}`,
            `Fração: ${fractionLabel}`,
            `Valor unitário: R$ ${unitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `Total: R$ ${fineResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ].join('\n');
    }

    function buildRemissionReport(): string {
        const typeLabel = remissionType === 'work' ? 'Trabalho' : 'Estudo';
        const inputLabel = remissionType === 'work' ? 'Dias trabalhados' : 'Horas de estudo';
        const ratio = remissionType === 'work' ? '1 dia a cada 3 dias' : '1 dia a cada 12 horas';
        const calcLine = remissionType === 'work'
            ? `${remissionInput} ÷ 3 = ${remissionResult}`
            : `${remissionInput} ÷ 12 = ${remissionResult}`;
        return [
            'RELATÓRIO - REMIÇÃO DE PENA',
            `Gerado em: ${formatNowPtBR()}`,
            '----------------------------------------',
            `Tipo: ${typeLabel}`,
            `${inputLabel}: ${remissionInput}`,
            `Proporção: ${ratio}`,
            '----------------------------------------',
            `Dias remidos: ${remissionResult} dia${remissionResult !== 1 ? 's' : ''}`,
            `Cálculo: ${calcLine}`
        ].join('\n');
    }

    function buildDosimetryReport(): string {
        const base = { years: dosiBaseYears, months: dosiBaseMonths, days: dosiBaseDays };
        const phase2Lines = dosiResult.phase2.operations.length
            ? dosiResult.phase2.operations.map((op, idx) => {
                    const sign = op.type === 'increase' ? '+' : '-';
                    const target = op.target === 'base' ? 'Base' : 'Acumulado';
                    return `${idx + 1}. ${op.name} (${sign}${op.fractionLabel} · ${target}) = ${formatDuration(op.result)}`;
                })
            : ['(sem operações)'];

        const phase3Lines = dosiResult.phase3.operations.length
            ? dosiResult.phase3.operations.map((op, idx) => {
                    const sign = op.type === 'increase' ? '+' : '-';
                    const target = op.target === 'base' ? 'Intermediária' : 'Acumulado';
                    return `${idx + 1}. ${op.name} (${sign}${op.fractionLabel} · ${target}) = ${formatDuration(op.result)}`;
                })
            : ['(sem operações)'];

        return [
            'RELATÓRIO - DOSIMETRIA DA PENA',
            `Gerado em: ${formatNowPtBR()}`,
            '----------------------------------------',
            `1ª fase (pena-base): ${formatDuration(base)}`,
            '----------------------------------------',
            '2ª fase (agravantes/atenuantes):',
            ...phase2Lines,
            `Parcial (intermediária): ${formatDuration(dosiResult.phase2.result)}`,
            '----------------------------------------',
            '3ª fase (causas de aumento/diminuição):',
            ...phase3Lines,
            '----------------------------------------',
            `Pena definitiva: ${formatDuration(dosiResult.phase3.result)}`
        ].join('\n');
    }

    function handleTabKeydown(e: KeyboardEvent) {
        const currentIndex = tabIndexByKey.get(activeTab as TabKey) ?? 0;
        let nextIndex: number | null = null;

        if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabOrder.length;
        else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = tabOrder.length - 1;

        if (nextIndex === null) return;
        e.preventDefault();

        const nextKey = tabOrder[nextIndex];
        setActiveTab(nextKey);
        tabButtons[nextKey]?.focus();
    }

  // Execution State (New)
  let execYears = $state(0);
  let execMonths = $state(0);
  let execDays = $state(0);
  let execBaseDate = $state(new Date().toISOString().split('T')[0]);
  let execProgressionFraction = $state(0.16);
  let execRemissionDays = $state(0);
  let execDetractionDays = $state(0);
  let execParoleFraction = $state(1/3);

  // Derived Execution State
  let execTotalDays = $derived.by(() => {
      return toDays({ years: execYears, months: execMonths, days: execDays });
  });

  let execBaseDateValid = $derived.by(() => {
      if (!execBaseDate) return false;
      const d = new Date(execBaseDate + 'T00:00:00');
      return !Number.isNaN(d.getTime());
  });

  let execProgressionDate = $derived.by(() => {
      if (!execBaseDateValid) return null;
      return calculateDate(execBaseDate, execTotalDays, execProgressionFraction, execRemissionDays + execDetractionDays);
  });

  let execParoleDate = $derived.by(() => {
      if (!execBaseDateValid) return null;
      return calculateDate(execBaseDate, execTotalDays, execParoleFraction, execRemissionDays + execDetractionDays);
  });

  let execEndDate = $derived.by(() => {
      if (!execBaseDateValid) return null;
      return calculateEndDate(execBaseDate, execTotalDays, execRemissionDays + execDetractionDays);
  });

  let execMemoryString = $derived.by(() => {
      const progressionLabel = progressionOptions.find(p => p.value === execProgressionFraction)?.label ?? 'Custom';
      const paroleLabel = fractionOptions.find(f => f.value === execParoleFraction)?.label ?? 'Custom';

    const progressionDateStr = execProgressionDate ? execProgressionDate.toLocaleDateString('pt-BR') : 'N/A';
    const paroleDateStr = execParoleDate ? execParoleDate.toLocaleDateString('pt-BR') : 'N/A';
    const endDateStr = execEndDate ? execEndDate.toLocaleDateString('pt-BR') : 'N/A';
      
      return `CÁLCULO DE EXECUÇÃO PENAL
----------------------------------------
Pena Total: ${execYears} anos, ${execMonths} meses, ${execDays} dias
Data-Base: ${formatISODatePtBR(execBaseDate)}
----------------------------------------
Progressão de Regime (${progressionLabel}):
Data: ${progressionDateStr}

Livramento Condicional (${paroleLabel}):
Data: ${paroleDateStr}

Término de Pena:
Data: ${endDateStr}
----------------------------------------
Deduções:
Remição: ${execRemissionDays} dias
Detração: ${execDetractionDays} dias
`;
  });

  // Fine State
  let fineDays = $state(10);
  let fineDate = $state(new Date().toISOString().split('T')[0]);
  let fineFractionValue = $state(1/30);
  let customWage = $state<number | null>(null);

  // Remission State
  let remissionType = $state<'work' | 'study'>('work');
  let remissionInput = $state(0);

  // Dosimetry State
  let dosiBaseYears = $state(0);
  let dosiBaseMonths = $state(0);
  let dosiBaseDays = $state(0);

  type Phase2FactorOption = {
      label: string;
      type: 'increase' | 'decrease';
  };
  const phase2FactorOptions: Phase2FactorOption[] = [
      // Agravantes (ex.: CP art. 61 e seguintes)
      { label: 'Reincidência', type: 'increase' },
      { label: 'Motivo torpe', type: 'increase' },
      { label: 'Motivo fútil', type: 'increase' },
      { label: 'Traição / emboscada / dissimulação', type: 'increase' },
      { label: 'Meio cruel', type: 'increase' },
      { label: 'Abuso de autoridade ou de poder', type: 'increase' },
      { label: 'Crime contra ascendente/descendente/cônjuge/companheiro', type: 'increase' },
      { label: 'Vítima menor de 14 anos / maior de 60 / enfermo / gestante', type: 'increase' },

      // Atenuantes (ex.: CP art. 65)
      { label: 'Confissão espontânea', type: 'decrease' },
      { label: 'Menoridade relativa (menos de 21 ao tempo do fato)', type: 'decrease' },
      { label: 'Maior de 70 anos na data da sentença', type: 'decrease' },
      { label: 'Reparação do dano / restituição', type: 'decrease' },
      { label: 'Relevante valor social ou moral', type: 'decrease' },
      { label: 'Sob violenta emoção (logo após injusta provocação)', type: 'decrease' }
  ];
  const phase2FactorByLabel = new Map<string, Phase2FactorOption>(phase2FactorOptions.map((o) => [o.label, o]));

  type Phase3CauseOption = {
      label: string;
      type: 'increase' | 'decrease';
  };
  const phase3CauseOptions: Phase3CauseOption[] = [
      // Aumento
      { label: 'Majorante (ex.: uso de arma, concurso, etc.)', type: 'increase' },
      { label: 'Concurso de pessoas', type: 'increase' },
      { label: 'Concurso material / formal / crime continuado', type: 'increase' },

      // Diminuição
      { label: 'Tentativa (diminuição)', type: 'decrease' },
      { label: 'Participação de menor importância', type: 'decrease' },
      { label: 'Arrependimento posterior', type: 'decrease' },
      { label: 'Privilegiadora (ex.: pequeno valor, etc.)', type: 'decrease' }
  ];
  const phase3CauseByLabel = new Map<string, Phase3CauseOption>(phase3CauseOptions.map((o) => [o.label, o]));
  
  let dosiPhase2Ops = $state<Omit<DosimetryOperation, 'result'>[]>([]);
  let dosiPhase3Ops = $state<Omit<DosimetryOperation, 'result'>[]>([]);

  // Derived Dosimetry Result
  let dosiResult = $derived.by(() => {
      const base = { years: dosiBaseYears, months: dosiBaseMonths, days: dosiBaseDays };
      return calculateDosimetry(base, dosiPhase2Ops, dosiPhase3Ops);
  });

  function addDosiOp(phase: 2 | 3) {
      const op: Omit<DosimetryOperation, 'result'> = {
          id: crypto.randomUUID(),
          name: '',
          fractionValue: 1/6,
          fractionLabel: '1/6',
          type: 'increase',
          target: 'base'
      };
      if (phase === 2) {
          dosiPhase2Ops = [...dosiPhase2Ops, op];
      } else {
          dosiPhase3Ops = [...dosiPhase3Ops, op];
      }
  }

  function removeDosiOp(phase: 2 | 3, id: string) {
      if (phase === 2) {
          dosiPhase2Ops = dosiPhase2Ops.filter(o => o.id !== id);
      } else {
          dosiPhase3Ops = dosiPhase3Ops.filter(o => o.id !== id);
      }
  }

  function updateDosiOp(phase: 2 | 3, id: string, updates: Partial<Omit<DosimetryOperation, 'result'>>) {
      if (phase === 2) {
          dosiPhase2Ops = dosiPhase2Ops.map(o => o.id === id ? { ...o, ...updates } : o);
      } else {
          dosiPhase3Ops = dosiPhase3Ops.map(o => o.id === id ? { ...o, ...updates } : o);
      }
  }

  // Fine Derived State
  let currentWage = $derived.by(() => {
      if (customWage !== null) return { value: customWage, law: 'Valor Manual', start: '' };
      return getMinimumWage(fineDate);
  });

  let fineResult = $derived.by(() => {
      const wage = currentWage?.value ?? 0;
      return calculateFine(fineDays, wage, fineFractionValue);
  });

  let fineMemoryString = $derived.by(() => {
      const wage = currentWage?.value ?? 0;
      const fractionLabel = fineFractions.find(f => f.value === fineFractionValue)?.label ?? 'Custom';
      
      return `CÁLCULO DE DIAS-MULTA
----------------------------------------
Data do Fato: ${formatISODatePtBR(fineDate)}
Salário Mínimo: R$ ${wage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Base Legal: ${currentWage?.law ?? 'N/A'}
----------------------------------------
Quantidade de Dias: ${fineDays}
Fração do Salário: ${fractionLabel}
----------------------------------------
Valor Total: R$ ${fineResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
`;
  });

  // Remission Derived State
  let remissionResult = $derived.by(() => {
      if (remissionType === 'work') {
          return Math.floor(remissionInput / 3);
      } else {
          return Math.floor(remissionInput / 12);
      }
  });

  let remissionMemoryString = $derived.by(() => {
      const typeLabel = remissionType === 'work' ? 'Trabalho' : 'Estudo';
      const inputLabel = remissionType === 'work' ? 'Dias Trabalhados' : 'Horas de Estudo';
      const ratio = remissionType === 'work' ? '1 dia de pena a cada 3 trabalhados' : '1 dia de pena a cada 12 horas de estudo';
      
      return `CÁLCULO DE REMIÇÃO DE PENA
----------------------------------------
Tipo: ${typeLabel}
${inputLabel}: ${remissionInput}
Proporção: ${ratio}
----------------------------------------
Dias Remidos (Tempo a descontar): ${remissionResult} dias
`;
  });

  function handleExecProgressionChange(e: Event) {
      const target = e.target as HTMLSelectElement;
      execProgressionFraction = parseFloat(target.value);
  }

  function handleExecParoleChange(e: Event) {
      const target = e.target as HTMLSelectElement;
      execParoleFraction = parseFloat(target.value);
  }

  function handleFineFractionChange(e: Event) {
      const target = e.target as HTMLSelectElement;
      fineFractionValue = parseFloat(target.value);
  }

  function copyToClipboard() {
        let text = '';
        if (activeTab === 'execution') text = buildExecutionReport();
        else if (activeTab === 'fine') text = buildFineReport();
        else if (activeTab === 'remission') text = buildRemissionReport();
        else if (activeTab === 'dosimetry') text = buildDosimetryReport();

    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

    let canCopy = $derived.by(() => {
        if (activeTab === 'execution') return execTotalDays > 0 && execBaseDateValid;
        if (activeTab === 'fine') return fineDays > 0 && !!fineDate && ((currentWage?.value ?? 0) > 0);
        if (activeTab === 'remission') return remissionInput > 0;
        if (activeTab === 'dosimetry') return toDays({ years: dosiBaseYears, months: dosiBaseMonths, days: dosiBaseDays }) > 0;
        return false;
    });

    let copyDisabledReason = $derived.by(() => {
        if (canCopy) return '';
        if (activeTab === 'execution') return 'Informe a pena e uma data-base válida para copiar.';
        if (activeTab === 'fine') return 'Informe a data e os parâmetros da multa para copiar.';
        if (activeTab === 'remission') return 'Informe dias/horas para copiar.';
        if (activeTab === 'dosimetry') return 'Informe a pena-base para copiar.';
        return 'Preencha os dados para copiar.';
    });
</script>

<div class="w-full max-w-md md:max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans">
  <!-- Header -->
    <div class="bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Calculadora Penal</h2>
      <p class="text-sm text-slate-500">Dosimetria e Execução</p>
    </div>
    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M9 15h.01"/><path d="M15 15h.01"/></svg>
    </div>
  </div>

    <!-- Tabs -->
        <div class="flex border-b border-slate-100 overflow-x-auto" role="tablist" aria-label="Calculadora penal" tabindex="0" onkeydown={handleTabKeydown}>
      <button
          bind:this={tabButtons.dosimetry}
          id="tab-dosimetry"
          role="tab"
          aria-selected={activeTab === 'dosimetry'}
          aria-controls="panel-dosimetry"
          tabindex={activeTab === 'dosimetry' ? 0 : -1}
          onclick={() => setActiveTab('dosimetry')}
          class={`flex-none sm:flex-1 px-4 sm:px-0 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === 'dosimetry' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
          Dosimetria
          {#if activeTab === 'dosimetry'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
          {/if}
      </button>
      <button
          bind:this={tabButtons.execution}
          id="tab-execution"
          role="tab"
          aria-selected={activeTab === 'execution'}
          aria-controls="panel-execution"
          tabindex={activeTab === 'execution' ? 0 : -1}
          onclick={() => setActiveTab('execution')}
          class={`flex-none sm:flex-1 px-4 sm:px-0 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === 'execution' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
          <span class="hidden sm:inline">Execução Penal</span>
          <span class="sm:hidden">Execução</span>
          {#if activeTab === 'execution'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
          {/if}
      </button>
      <button
          bind:this={tabButtons.fine}
          id="tab-fine"
          role="tab"
          aria-selected={activeTab === 'fine'}
          aria-controls="panel-fine"
          tabindex={activeTab === 'fine' ? 0 : -1}
          onclick={() => setActiveTab('fine')}
          class={`flex-none sm:flex-1 px-4 sm:px-0 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === 'fine' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
          <span class="hidden sm:inline">Dias-Multa</span>
          <span class="sm:hidden">Multa</span>
          {#if activeTab === 'fine'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
          {/if}
      </button>
      <button
          bind:this={tabButtons.remission}
          id="tab-remission"
          role="tab"
          aria-selected={activeTab === 'remission'}
          aria-controls="panel-remission"
          tabindex={activeTab === 'remission' ? 0 : -1}
          onclick={() => setActiveTab('remission')}
          class={`flex-none sm:flex-1 px-4 sm:px-0 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === 'remission' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
          <span class="hidden sm:inline">Remição (Trabalho/Estudo)</span>
          <span class="sm:hidden">Remição</span>
          {#if activeTab === 'remission'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
          {/if}
      </button>
  </div>

  <div class="p-4 sm:p-6 space-y-6">
    {#if activeTab === 'execution'}
    <div id="panel-execution" role="tabpanel" tabindex="0" aria-labelledby="tab-execution" class="space-y-6">
        <!-- Sentence Data -->
        <div class="space-y-3">
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Dados da Pena</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="space-y-2">
                    <label for="execYears" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Anos</label>
                    <input id="execYears" type="number" min="0" bind:value={execYears} class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2" />
                </div>
                <div class="space-y-2">
                    <label for="execMonths" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Meses</label>
                    <input id="execMonths" type="number" min="0" bind:value={execMonths} class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2" />
                </div>
                <div class="space-y-2">
                    <label for="execDays" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Dias</label>
                    <input id="execDays" type="number" min="0" bind:value={execDays} class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2" />
                </div>
            </div>
            <div class="space-y-2">
                <label for="execBaseDate" class="text-sm font-medium text-slate-900">Data-Base (Início/Última Prisão)</label>
                <input
                    id="execBaseDate"
                    type="date"
                    bind:value={execBaseDate}
                    class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                />
            </div>
        </div>

        <!-- Progression Settings -->
        <div class="space-y-3">
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Critérios de Progressão</h3>
            <div class="space-y-2">
                <label for="execProgression" class="text-sm font-medium text-slate-900">Tipo de Crime (Fração de Progressão)</label>
                <div class="relative">
                    <select
                        id="execProgression"
                        onchange={handleExecProgressionChange}
                        value={execProgressionFraction}
                        class="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 appearance-none"
                    >
                        {#each progressionOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </div>
            </div>
        </div>

        <!-- Deductions -->
        <div class="space-y-3">
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Deduções</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label for="execRemission" class="text-sm font-medium text-slate-900">Remição (Dias)</label>
                    <input id="execRemission" type="number" min="0" bind:value={execRemissionDays} class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2" />
                    <p class="text-xs text-slate-500">Trabalho/Estudo</p>
                </div>
                <div class="space-y-2">
                    <label for="execDetraction" class="text-sm font-medium text-slate-900">Detração (Dias)</label>
                    <input id="execDetraction" type="number" min="0" bind:value={execDetractionDays} class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2" />
                    <p class="text-xs text-slate-500">Tempo preso provisoriamente</p>
                </div>
            </div>
        </div>

        <!-- Parole Settings -->
        <div class="space-y-3">
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Livramento Condicional</h3>
            <div class="space-y-2">
                <label for="execParole" class="text-sm font-medium text-slate-900">Requisito Objetivo</label>
                <div class="relative">
                    <select
                        id="execParole"
                        onchange={handleExecParoleChange}
                        value={execParoleFraction}
                        class="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 appearance-none"
                    >
                        <option value={1/3}>1/3 - Comum</option>
                        <option value={1/2}>1/2 - Reincidente Doloso</option>
                        <option value={2/3}>2/3 - Hediondo</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </div>
            </div>
        </div>

        {#if execTotalDays <= 0 || !execBaseDateValid}
            <div class="rounded-lg bg-amber-50 border border-amber-100 p-4">
                <div class="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Atenção</div>
                <div class="text-sm text-amber-900">
                    {#if execTotalDays <= 0}
                        Informe a pena (anos/meses/dias) para calcular as datas.
                    {:else}
                        Informe uma data-base válida para calcular as datas.
                    {/if}
                </div>
            </div>
        {:else}
        <div class="rounded-lg bg-slate-50 border border-slate-100 p-4">
            <div class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Resumo</div>
            <div class="text-sm text-slate-900">
                Pena total: <span class="font-medium">{execTotalDays} dias</span> · Deduções: <span class="font-medium">{execRemissionDays + execDetractionDays} dias</span>
            </div>
            <div class="text-xs text-slate-500 mt-1">
                Data-base: <span class="font-medium text-slate-700">{formatISODatePtBR(execBaseDate)}</span>
            </div>
        </div>

        <!-- Results -->
        <div class="grid grid-cols-1 gap-4 pt-2">
            <!-- Progression Result -->
            <div class="rounded-lg bg-sky-50 border border-sky-100 p-4">
                <div class="text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">Data para Progressão de Regime</div>
                <div class="text-2xl font-bold text-sky-900 tracking-tight">
                    {execProgressionDate?.toLocaleDateString('pt-BR')}
                </div>
                <div class="mt-1 text-xs text-sky-600">
                    Requisito: {Math.ceil(execTotalDays * execProgressionFraction)} dias - {execRemissionDays + execDetractionDays} dias (deduções)
                </div>
            </div>

            <!-- Parole Result -->
            <div class="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
                <div class="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Data para Livramento Condicional</div>
                <div class="text-2xl font-bold text-indigo-900 tracking-tight">
                    {execParoleDate?.toLocaleDateString('pt-BR')}
                </div>
                <div class="mt-1 text-xs text-indigo-600">
                    Requisito: {Math.ceil(execTotalDays * execParoleFraction)} dias - {execRemissionDays + execDetractionDays} dias (deduções)
                </div>
            </div>

            <!-- End Date Result -->
            <div class="rounded-lg bg-slate-100 border border-slate-200 p-4">
                <div class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Término de Pena (TCP)</div>
                <div class="text-2xl font-bold text-slate-900 tracking-tight">
                    {execEndDate?.toLocaleDateString('pt-BR')}
                </div>
                <div class="mt-1 text-xs text-slate-600">
                    Total: {execTotalDays} dias - {execRemissionDays + execDetractionDays} dias (deduções)
                </div>
            </div>
        </div>
        {/if}
    </div>

    {:else if activeTab === 'dosimetry'}
    <div id="panel-dosimetry" role="tabpanel" tabindex="0" aria-labelledby="tab-dosimetry" class="space-y-6">
        <!-- Phase 1 -->
        <div class="space-y-3">
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">1ª Fase - Pena Base</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="space-y-2">
                    <label for="dosiYears" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Anos</label>
                    <input id="dosiYears" type="number" min="0" bind:value={dosiBaseYears} class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2" />
                </div>
                <div class="space-y-2">
                    <label for="dosiMonths" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Meses</label>
                    <input id="dosiMonths" type="number" min="0" bind:value={dosiBaseMonths} class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2" />
                </div>
                <div class="space-y-2">
                    <label for="dosiDays" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Dias</label>
                    <input id="dosiDays" type="number" min="0" bind:value={dosiBaseDays} class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2" />
                </div>
            </div>
        </div>

        <!-- Phase 2 -->
        <div class="space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">2ª Fase - Agravantes e Atenuantes</h3>
                <button onclick={() => addDosiOp(2)} class="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 -mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                    Adicionar
                </button>
            </div>
            
            {#if dosiPhase2Ops.length === 0}
                <div class="text-sm text-slate-400 italic py-2">Nenhuma agravante ou atenuante adicionada.</div>
            {:else}
                <div class="space-y-3">
                    {#each dosiPhase2Ops as op (op.id)}
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="w-full">
                                    <label class="sr-only" for={`p2-name-${op.id}`}>Agravante/Atenuante</label>
                                    <select
                                        id={`p2-name-${op.id}`}
                                        value={op.name}
                                        onchange={(e) => {
                                            const label = (e.currentTarget as HTMLSelectElement).value;
                                            const selected = phase2FactorByLabel.get(label);
                                            updateDosiOp(2, op.id, {
                                                name: label,
                                                ...(selected ? { type: selected.type } : {})
                                            });
                                        }}
                                        class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                                    >
                                        <option value="" disabled>Selecione a agravante/atenuante</option>
                                        {#each phase2FactorOptions as opt}
                                            <option value={opt.label}>{opt.label}</option>
                                        {/each}
                                    </select>
                                </div>
                                <button onclick={() => removeDosiOp(2, op.id)} class="p-2 -m-2 text-slate-400 hover:text-red-500" aria-label="Remover operação" title="Remover">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
                                </button>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="text-xs text-slate-500 block mb-1" for={`p2-type-${op.id}`}>Tipo</label>
                                    <select
                                        id={`p2-type-${op.id}`}
                                        value={op.type}
                                        onchange={(e) => updateDosiOp(2, op.id, { type: (e.currentTarget as HTMLSelectElement).value as any })}
                                        class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                                    >
                                        <option value="increase">Agravante (+)</option>
                                        <option value="decrease">Atenuante (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs text-slate-500 block mb-1" for={`p2-frac-${op.id}`}>Fração</label>
                                    <select 
                                        id={`p2-frac-${op.id}`}
                                        value={op.fractionValue} 
                                        onchange={(e) => {
                                            const val = parseFloat(e.currentTarget.value);
                                            const label = e.currentTarget.options[e.currentTarget.selectedIndex].text;
                                            updateDosiOp(2, op.id, { fractionValue: val, fractionLabel: label });
                                        }}
                                        class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                                    >
                                        <option value={1/6}>1/6</option>
                                        <option value={1/3}>1/3</option>
                                        <option value={1/2}>1/2</option>
                                        <option value={2/3}>2/3</option>
                                    </select>
                                </div>
                            </div>
                            <fieldset>
                                <legend class="text-xs text-slate-500 block mb-1">Aplicar sobre</legend>
                                <div class="flex flex-col sm:flex-row gap-3" role="radiogroup" aria-label="Aplicar sobre">
                                    <label class="flex items-center gap-1 text-xs cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`p2-target-${op.id}`}
                                            checked={op.target === 'base'}
                                            onchange={() => updateDosiOp(2, op.id, { target: 'base' })}
                                            class="text-slate-900 focus:ring-slate-900"
                                        />
                                        Pena Base
                                    </label>
                                    <label class="flex items-center gap-1 text-xs cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`p2-target-${op.id}`}
                                            checked={op.target === 'current'}
                                            onchange={() => updateDosiOp(2, op.id, { target: 'current' })}
                                            class="text-slate-900 focus:ring-slate-900"
                                        />
                                        Acumulado
                                    </label>
                                </div>
                            </fieldset>
                        </div>
                    {/each}
                </div>
            {/if}
            <div class="text-xs text-right text-slate-500">
                Parcial: <span class="font-medium text-slate-900">{formatDuration(dosiResult.phase2.result)}</span>
            </div>
        </div>

        <!-- Phase 3 -->
        <div class="space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">3ª Fase - Causas de Aumento e Diminuição</h3>
                <button onclick={() => addDosiOp(3)} class="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 -mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                    Adicionar
                </button>
            </div>
            
            {#if dosiPhase3Ops.length === 0}
                <div class="text-sm text-slate-400 italic py-2">Nenhuma causa adicionada.</div>
            {:else}
                <div class="space-y-3">
                    {#each dosiPhase3Ops as op (op.id)}
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="w-full">
                                    <label class="sr-only" for={`p3-name-${op.id}`}>Causa de Aumento/Diminuição</label>
                                    <select
                                        id={`p3-name-${op.id}`}
                                        value={op.name}
                                        onchange={(e) => {
                                            const label = (e.currentTarget as HTMLSelectElement).value;
                                            const selected = phase3CauseByLabel.get(label);
                                            updateDosiOp(3, op.id, {
                                                name: label,
                                                ...(selected ? { type: selected.type } : {})
                                            });
                                        }}
                                        class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                                    >
                                        <option value="" disabled>Selecione a causa</option>
                                        {#each phase3CauseOptions as opt}
                                            <option value={opt.label}>{opt.label}</option>
                                        {/each}
                                    </select>
                                </div>
                                <button onclick={() => removeDosiOp(3, op.id)} class="p-2 -m-2 text-slate-400 hover:text-red-500" aria-label="Remover operação" title="Remover">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
                                </button>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="text-xs text-slate-500 block mb-1" for={`p3-type-${op.id}`}>Tipo</label>
                                    <select
                                        id={`p3-type-${op.id}`}
                                        value={op.type}
                                        onchange={(e) => updateDosiOp(3, op.id, { type: (e.currentTarget as HTMLSelectElement).value as any })}
                                        class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                                    >
                                        <option value="increase">Aumento (+)</option>
                                        <option value="decrease">Diminuição (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs text-slate-500 block mb-1" for={`p3-frac-${op.id}`}>Fração</label>
                                    <select 
                                        id={`p3-frac-${op.id}`}
                                        value={op.fractionValue} 
                                        onchange={(e) => {
                                            const val = parseFloat(e.currentTarget.value);
                                            const label = e.currentTarget.options[e.currentTarget.selectedIndex].text;
                                            updateDosiOp(3, op.id, { fractionValue: val, fractionLabel: label });
                                        }}
                                        class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                                    >
                                        <option value={1/6}>1/6</option>
                                        <option value={1/3}>1/3</option>
                                        <option value={1/2}>1/2</option>
                                        <option value={2/3}>2/3</option>
                                    </select>
                                </div>
                            </div>
                            <fieldset>
                                <legend class="text-xs text-slate-500 block mb-1">Aplicar sobre</legend>
                                <div class="flex flex-col sm:flex-row gap-3" role="radiogroup" aria-label="Aplicar sobre">
                                    <label class="flex items-center gap-1 text-xs cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`p3-target-${op.id}`}
                                            checked={op.target === 'base'}
                                            onchange={() => updateDosiOp(3, op.id, { target: 'base' })}
                                            class="text-slate-900 focus:ring-slate-900"
                                        />
                                        Pena Intermediária
                                    </label>
                                    <label class="flex items-center gap-1 text-xs cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`p3-target-${op.id}`}
                                            checked={op.target === 'current'}
                                            onchange={() => updateDosiOp(3, op.id, { target: 'current' })}
                                            class="text-slate-900 focus:ring-slate-900"
                                        />
                                        Acumulado
                                    </label>
                                </div>
                            </fieldset>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Result Box -->
        <div class="rounded-lg bg-purple-50 border border-purple-100 p-4 transition-all duration-300">
            <div class="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Pena Definitiva</div>
            <div class="text-3xl font-bold text-purple-900 tracking-tight">
                {formatDuration(dosiResult.phase3.result)}
            </div>
            <div class="mt-2 text-xs text-purple-600">
                Base: {formatDuration(dosiResult.phase1)} → Intermediária: {formatDuration(dosiResult.phase2.result)}
            </div>
        </div>
    </div>
    {:else if activeTab === 'fine'}
    <!-- Fine Calculator -->
    <div id="panel-fine" role="tabpanel" tabindex="0" aria-labelledby="tab-fine" class="space-y-4">
        <div class="space-y-2">
            <label for="fineDate" class="text-sm font-medium text-slate-900">Data do Fato</label>
            <input
                id="fineDate"
                type="date"
                bind:value={fineDate}
                class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {#if currentWage}
                <div class="text-xs text-slate-500 flex items-center gap-1">
                    <span class="font-medium">Salário Mínimo:</span> R$ {currentWage.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    <span class="text-slate-300">|</span>
                    <span class="italic">{currentWage.law}</span>
                </div>
            {:else}
                <div class="text-xs text-amber-600">Data sem registro histórico. Insira o valor manualmente.</div>
            {/if}
        </div>

        {#if !currentWage || customWage !== null}
             <div class="space-y-2">
                <label for="customWage" class="text-sm font-medium text-slate-900">Valor do Salário Mínimo (R$)</label>
                <input
                    id="customWage"
                    type="number"
                    step="0.01"
                    bind:value={customWage}
                    class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                    placeholder="0,00"
                />
            </div>
        {/if}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
                <label for="fineDays" class="text-sm font-medium text-slate-900">Dias-Multa</label>
                <input
                    id="fineDays"
                    type="number"
                    min="10"
                    max="360"
                    bind:value={fineDays}
                    class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                />
            </div>
            <div class="space-y-2">
                <label for="fineFraction" class="text-sm font-medium text-slate-900">Fração do Salário</label>
                <div class="relative">
                    <select
                        id="fineFraction"
                        onchange={handleFineFractionChange}
                        value={fineFractionValue}
                        class="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 appearance-none"
                    >
                        {#each fineFractions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </div>
            </div>
        </div>

        <!-- Result Box -->
        <div class="rounded-lg bg-emerald-50 border border-emerald-100 p-4 transition-all duration-300">
            <div class="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Valor da Multa</div>
            <div class="text-3xl font-bold text-emerald-900 tracking-tight">
                R$ {fineResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div class="mt-2 text-xs text-emerald-600">
                {fineDays} dias × (R$ {((currentWage?.value ?? 0) * fineFractionValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </div>
        </div>
    </div>
    {:else}
    <!-- Remission Calculator -->
    <div id="panel-remission" role="tabpanel" tabindex="0" aria-labelledby="tab-remission" class="space-y-4">
        <div class="flex flex-col sm:flex-row gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="remissionType" value="work" bind:group={remissionType} class="text-slate-900 focus:ring-slate-900" />
                <span class="text-sm font-medium text-slate-900">Por Trabalho</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="remissionType" value="study" bind:group={remissionType} class="text-slate-900 focus:ring-slate-900" />
                <span class="text-sm font-medium text-slate-900">Por Estudo</span>
            </label>
        </div>

        <div class="space-y-2">
            <label for="remissionInput" class="text-sm font-medium text-slate-900">
                {remissionType === 'work' ? 'Dias Trabalhados' : 'Horas de Estudo'}
            </label>
            <input
                id="remissionInput"
                type="number"
                min="0"
                bind:value={remissionInput}
                class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
            />
            <p class="text-xs text-slate-500">
                {remissionType === 'work' 
                    ? 'A cada 3 dias de trabalho, remi-se 1 dia de pena.' 
                    : 'A cada 12 horas de frequência escolar, remi-se 1 dia de pena.'}
            </p>
        </div>

        <!-- Result Box -->
        <div class="rounded-lg bg-indigo-50 border border-indigo-100 p-4 transition-all duration-300">
            <div class="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Tempo a Remir (Descontar)</div>
            <div class="text-3xl font-bold text-indigo-900 tracking-tight">
                {remissionResult} dia{remissionResult !== 1 ? 's' : ''}
            </div>
            <div class="mt-2 text-xs text-indigo-600">
                {remissionType === 'work' 
                    ? `${remissionInput} ÷ 3 = ${remissionResult}` 
                    : `${remissionInput} ÷ 12 = ${remissionResult}`}
            </div>
        </div>
    </div>
    {/if}

    <!-- Actions -->
    <button
            onclick={() => canCopy && copyToClipboard()}
            disabled={!canCopy}
            aria-disabled={!canCopy}
            title={!canCopy ? copyDisabledReason : 'Copiar relatório'}
            class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 h-10 px-4 py-2 w-full active:scale-[0.98]"
    >
      {#if copied}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
        <span class="text-emerald-600">Copiado!</span>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span>Copiar Relatório</span>
      {/if}
    </button>

        {#if !canCopy}
            <div class="text-xs text-slate-500">{copyDisabledReason}</div>
        {/if}
  </div>
</div>

