import type { createControllers } from '../../container';

/** Derived from the composition root so this list can never drift from it */
export type ApiRouteDeps = ReturnType<typeof createControllers>;
