/// <reference types="vite/client" />

/*
 * Vite client types.
 *
 * The project keeps its runtime imagery in public/ and references it by
 * absolute URL, so no asset module declarations were needed before. The Work
 * section's background lives in the project-root assets/ folder, which Vite
 * does NOT serve, so it must be imported through the bundler — and that import
 * needs Vite's `*.png` module typing. This one reference supplies it (plus the
 * usual import.meta.env typing) without changing the compiler options.
 */
