export type MessageTree = { [key: string]: string | MessageTree };
export type TranslateVars = Record<string, string | number>;

function lookup(tree: MessageTree, key: string): string | undefined {
  let cur: string | MessageTree | undefined = tree;
  for (const part of key.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] === undefined ? `{${name}}` : String(vars[name])
  );
}

export type TFunction = (key: string, vars?: TranslateVars) => string;

export function createT(tree: MessageTree): TFunction {
  return function t(key: string, vars?: TranslateVars): string {
    const found = lookup(tree, key);
    if (found === undefined) return key;
    return interpolate(found, vars);
  };
}

export function tChannel(t: TFunction, channel: string): string {
  const key = `channel.${channel}`;
  const out = t(key);
  return out === key ? channel : out;
}

export function tStatus(t: TFunction, status: string): string {
  const key = `status.${status}`;
  const out = t(key);
  return out === key ? status : out;
}
