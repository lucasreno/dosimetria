<script lang="ts">
  import {
    type Duration,
    calculateExecution,
    fractionOptions,
    formatDuration,
    generateMemoryString
  } from '$lib/logic/calculator';

  // Svelte 5 Runes
  let years = $state(0);
  let months = $state(0);
  let days = $state(0);
  let selectedFractionValue = $state(1);
  let mode = $state<'soma' | 'subtracao'>('soma');
  let copied = $state(false);

  // Derived state for the result calculation
  let result = $derived.by(() => {
    const base: Duration = { years, months, days };
    return calculateExecution(base, selectedFractionValue);
  });

  // Derived state for the memory string
  let memoryString = $derived.by(() => {
    const base: Duration = { years, months, days };
    const fractionLabel = fractionOptions.find(f => f.value === selectedFractionValue)?.label ?? 'Custom';
    return generateMemoryString(base, fractionLabel, result, mode);
  });

  function copyToClipboard() {
    navigator.clipboard.writeText(memoryString);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function handleFractionChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    selectedFractionValue = parseFloat(target.value);
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

  <div class="p-6 space-y-6">
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
      <div class="text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">Resultado Calculado</div>
      <div class="text-3xl font-bold text-sky-900 tracking-tight">
        {formatDuration(result)}
      </div>
      <div class="mt-2 text-xs text-sky-600 flex items-center gap-2">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-sky-400"></span>
        Base: {years}a {months}m {days}d
        <span class="text-sky-300">|</span>
        Fração: {selectedFractionValue === 1 ? '100%' : (selectedFractionValue * 100).toFixed(1) + '%'}
      </div>
    </div>

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
        <span>Copiar Memória de Cálculo</span>
      {/if}
    </button>
  </div>
</div>
