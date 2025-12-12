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
    fromDays
  } from '$lib/logic/calculator';
  import {
    type MinimumWage,
    getMinimumWage,
    calculateFine,
    fineFractions
  } from '$lib/logic/fine';

  // Svelte 5 Runes
  let activeTab = $state<'execution' | 'fine' | 'remission'>('execution');

  // Execution State
  let years = $state(0);
  let months = $state(0);
  let days = $state(0);
  let selectedFractionValue = $state(1);
  let mode = $state<'soma' | 'subtracao'>('soma');
  let copied = $state(false);
  let items = $state<CalculationItem[]>([]);

  // Fine State
  let fineDays = $state(10);
  let fineDate = $state(new Date().toISOString().split('T')[0]);
  let fineFractionValue = $state(1/30);
  let customWage = $state<number | null>(null);

  // Remission State
  let remissionType = $state<'work' | 'study'>('work');
  let remissionInput = $state(0);

  // Derived state for the result calculation
  let currentResult = $derived.by(() => {
    const base: Duration = { years, months, days };
    return calculateExecution(base, selectedFractionValue);
  });

  // Derived state for the total result
  let totalResult = $derived.by(() => {
    if (items.length === 0) return currentResult;
    
    let totalDays = 0;
    items.forEach(item => {
        totalDays += toDays(item.result);
    });
    return fromDays(totalDays);
  });

  // Derived state for total base (for remaining calculation)
  let totalBase = $derived.by(() => {
      if (items.length === 0) return { years, months, days };
      let totalDays = 0;
      items.forEach(item => {
          totalDays += toDays(item.base);
      });
      return fromDays(totalDays);
  });

  // Derived state for remaining time (only for subtraction mode)
  let remainingTime = $derived.by(() => {
      if (mode !== 'subtracao') return null;
      return subtractDuration(totalBase, totalResult);
  });

  // Derived state for the memory string
  let memoryString = $derived.by(() => {
    if (items.length === 0) {
        const base: Duration = { years, months, days };
        const fractionLabel = fractionOptions.find(f => f.value === selectedFractionValue)?.label ?? 'Custom';
        const item: CalculationItem = {
            id: 'temp',
            base,
            fractionValue: selectedFractionValue,
            fractionLabel,
            result: currentResult
        };
        return generateReport([item], mode);
    }
    return generateReport(items, mode);
  });

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
Data do Fato: ${new Date(fineDate).toLocaleDateString('pt-BR')}
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

  function addItem() {
    const base: Duration = { years, months, days };
    const fractionLabel = fractionOptions.find(f => f.value === selectedFractionValue)?.label ?? 'Custom';
    
    // Don't add empty calculations
    if (years === 0 && months === 0 && days === 0) return;

    items = [...items, {
        id: crypto.randomUUID(),
        base,
        fractionValue: selectedFractionValue,
        fractionLabel,
        result: currentResult
    }];

    // Reset inputs
    years = 0;
    months = 0;
    days = 0;
    selectedFractionValue = 1;
  }

  function removeItem(id: string) {
      items = items.filter(i => i.id !== id);
  }

  function copyToClipboard() {
    let text = '';
    if (activeTab === 'execution') text = memoryString;
    else if (activeTab === 'fine') text = fineMemoryString;
    else text = remissionMemoryString;

    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function handleFractionChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    selectedFractionValue = parseFloat(target.value);
  }

  function handleFineFractionChange(e: Event) {
      const target = e.target as HTMLSelectElement;
      fineFractionValue = parseFloat(target.value);
  }
</script>

<div class="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans">
  <!-- Header -->
  <div class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Calculadora Penal</h2>
      <p class="text-sm text-slate-500">Dosimetria e Execução</p>
    </div>
    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M9 15h.01"/><path d="M15 15h.01"/></svg>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex border-b border-slate-100">
      <button
          onclick={() => activeTab = 'execution'}
          class={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'execution' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
          Execução Penal
          {#if activeTab === 'execution'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
          {/if}
      </button>
      <button
          onclick={() => activeTab = 'fine'}
          class={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'fine' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
          Dias-Multa
          {#if activeTab === 'fine'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
          {/if}
      </button>
      <button
          onclick={() => activeTab = 'remission'}
          class={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'remission' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
          Remição (Trabalho/Estudo)
          {#if activeTab === 'remission'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
          {/if}
      </button>
  </div>

  <div class="p-6 space-y-6">
    {#if activeTab === 'execution'}
    <!-- Duration Inputs -->
    <div class="grid grid-cols-3 gap-4">
      <div class="space-y-2">
        <label for="years" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Anos</label>
        <input
          id="years"
          type="number"
          min="0"
          bind:value={years}
          class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
          placeholder="0"
        />
      </div>
      <div class="space-y-2">
        <label for="months" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Meses</label>
        <input
          id="months"
          type="number"
          min="0"
          bind:value={months}
          class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
          placeholder="0"
        />
      </div>
      <div class="space-y-2">
        <label for="days" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Dias</label>
        <input
          id="days"
          type="number"
          min="0"
          bind:value={days}
          class="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
          placeholder="0"
        />
      </div>
    </div>

    <!-- Fraction Selection -->
    <div class="space-y-2">
      <label for="fraction" class="text-sm font-medium text-slate-900">Fração da Pena</label>
      <div class="relative">
        <select
          id="fraction"
          onchange={handleFractionChange}
          value={selectedFractionValue}
          class="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
        >
          {#each fractionOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
    </div>

    <!-- Add Button -->
    <button
        onclick={addItem}
        class="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 hover:bg-slate-900/90 h-10 px-4 py-2"
    >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        Adicionar ao Cálculo
    </button>

    <!-- Items List -->
    {#if items.length > 0}
        <div class="space-y-2 border-t border-slate-100 pt-4">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Itens Adicionados</h3>
            {#each items as item, i}
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                    <div>
                        <div class="font-medium text-slate-900">#{i + 1} - {formatDuration(item.base)}</div>
                        <div class="text-slate-500 text-xs">Fração: {item.fractionLabel} -> {formatDuration(item.result)}</div>
                    </div>
                    <button onclick={() => removeItem(item.id)} class="text-slate-400 hover:text-red-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
                    </button>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Toggle Mode -->
    <div class="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div class="space-y-0.5">
        <div class="text-sm font-medium text-slate-900">
          {mode === 'soma' ? 'Modo Progressão' : 'Modo Remição/Detração'}
        </div>
        <div class="text-xs text-slate-500">
          {mode === 'soma' ? 'Calculando fração da pena' : 'Calculando tempo a deduzir'}
        </div>
      </div>
      <button
        onclick={() => mode = mode === 'soma' ? 'subtracao' : 'soma'}
        class={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2
          ${mode === 'soma' ? 'bg-slate-900' : 'bg-emerald-600'}
        `}
        role="switch"
        aria-checked={mode === 'subtracao'}
        title="Alternar modo"
      >
        <span
          class={`
            pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out
            ${mode === 'soma' ? 'translate-x-0' : 'translate-x-5'}
          `}
        ></span>
      </button>
    </div>

    <!-- Result Box -->
    <div class="rounded-lg bg-sky-50 border border-sky-100 p-4 transition-all duration-300">
      <div class="text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">
          {items.length > 0 ? 'Resultado Total' : 'Resultado Atual'}
      </div>
      <div class="text-3xl font-bold text-sky-900 tracking-tight">
        {formatDuration(totalResult)}
      </div>
      
      {#if mode === 'subtracao' && remainingTime}
        <div class="mt-3 pt-3 border-t border-sky-200">
            <div class="text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">Tempo Restante</div>
            <div class="text-xl font-bold text-sky-800 tracking-tight">
                {formatDuration(remainingTime)}
            </div>
        </div>
      {/if}

      <div class="mt-2 text-xs text-sky-600 flex items-center gap-2">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-sky-400"></span>
        {items.length > 0 ? 'Total Base' : 'Base'}: {formatDuration(totalBase)}
      </div>
    </div>

    {:else if activeTab === 'fine'}
    <!-- Fine Calculator -->
    <div class="space-y-4">
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

        <div class="grid grid-cols-2 gap-4">
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
    <div class="space-y-4">
        <div class="flex gap-4">
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
      onclick={copyToClipboard}
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
  </div>
</div>

