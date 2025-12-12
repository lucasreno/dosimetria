# Calculator Component - dosimetria.io

This repository contains the Svelte 5 component for the "dosimetria.io" SaaS penal calculator.

## Files

- `src/lib/logic/calculator.ts`: Contains the business logic, types, and Zod schema.
- `src/lib/components/Calculator.svelte`: The UI component using Svelte 5 Runes and TailwindCSS.

## Project Setup & Running

This project uses [Bun](https://bun.sh) as the runtime and package manager.

### Prerequisites

- [Bun](https://bun.sh) (v1.0 or later)

### Installation

Install the dependencies:

```bash
bun install
```

### Running the Development Server

Start the development server:

```bash
bun run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

To create a production build:

```bash
bun run build
```

You can preview the production build with:

```bash
bun run preview
```

## Usage in Code

Import the component in your SvelteKit page:

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
