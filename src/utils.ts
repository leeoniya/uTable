import { Expr, initFilter } from 'uexpr';
import type { SchemaColumn } from "udsv";

type Sorter = [pos: number, colIdx: number, sortDir: number];
type TupleSortFn = (a: string[], b: string[]) => number;

const cmp = new Intl.Collator('en', { numeric: true, sensitivity: 'base' }).compare;

export const compileSorterTuples = (cols: SchemaColumn[], pos: number[], dir: number[], simple = false): TupleSortFn | null => {
  let sorts: Sorter[] = [];

  for (let ci = 0; ci < dir.length; ci++) {
    if (dir[ci] != 0)
      sorts.push([pos[ci], ci, dir[ci]]);
  }

  if (sorts.length == 0)
    return null;

  sorts.sort((a, b) => a[0] - b[0]);

  // todo: handle nulls?
  let body = sorts.map(s => {
    let col = cols[s[1]];
    let a = `a[${s[1]}]`;
    let b = `b[${s[1]}]`;

    return (
      col.type == 'n' ? `${s[2]} * (${a} - ${b})` :
      simple          ? `${s[2]} * (${a} > ${b} ? 1 : ${a} < ${b} ? -1 : 0)` :
                        `${s[2]} * cmp(${a}, ${b})`
    );
  }).join(' || ');

  return new Function('cmp', `
    return (a, b) => ${body};
  `)(cmp);
};

export const compileMatcherStringTuples = (rules: Expr[]) => {
  let nonEmpty = rules.filter(r => r[2] != '');

  if (nonEmpty.length == 0)
    return (data: string[][]) => data;

  // add null handling, maybe for strings uExpr should parse as '' and nums as 0?
  let rules2 = ['&&',
    ...nonEmpty.flatMap(r => [
        ['!==', r[1], null],
        r,
    ])
  ] as unknown as Expr;

  // add uFuzzy, case insensitivity?

  // todo: make empty value acceptable, (isNull, falsy, cmp against explicit empty, etc)
  return initFilter<string[]>(rules2);
};

export function haltEvent(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
}

export function onWinCap(type: string, fn: EventListener) {
  window.addEventListener(type, fn, {capture: true});
}

export function offWinCap(type: string, fn: EventListener) {
  window.removeEventListener(type, fn, {capture: true});
}

export function clamp(val: number, min: number, max: number) {
  return val < min ? min : val > max ? max : val;
}