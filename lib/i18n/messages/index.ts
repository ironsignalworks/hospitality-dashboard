import { en } from './en';
import { pt } from './pt';
import type { Locale } from '../locale';
import type { MessageTree } from '../translate';

const dictionaries: Record<Locale, MessageTree> = { en, pt };

export function messagesFor(locale: Locale): MessageTree {
  return dictionaries[locale];
}
