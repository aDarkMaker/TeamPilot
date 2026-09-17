import { useLayoutEffect, useEffect } from 'react';

/** useLayoutEffect in the browser, useEffect during SSR */
export const useIsoLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;
