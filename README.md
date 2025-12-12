# Calculator Component

This directory contains the Svelte 5 component for the "dosimetria.io" SaaS penal calculator.

## Files

- `src/lib/logic/calculator.ts`: Contains the business logic, types, and Zod schema.
- `src/lib/components/Calculator.svelte`: The UI component using Svelte 5 Runes and TailwindCSS.

## Usage

1. Ensure you have a SvelteKit project set up with TailwindCSS.
2. Place the files in the corresponding directories.
3. Import the component in your page:

```svelte
<script>
  import Calculator from '$lib/components/Calculator.svelte';
</script>

<Calculator />
```

## Dependencies

- Svelte 5 (Runes)
- TailwindCSS
- Zod (for validation logic schema)
