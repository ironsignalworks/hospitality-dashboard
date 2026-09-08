'use client';

import { useT } from './locale-provider';
import type { TranslateVars } from './translate';

export function T({ k, vars }: { k: string; vars?: TranslateVars }) {
  const t = useT();
  return <>{t(k, vars)}</>;
}
