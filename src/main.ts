import { update, component, getProps, createRoot, useState, invalidate, useEffect } from "ivi";
import { htm as html } from "@ivi/htm";
import { Schema, inferSchema, initParser, type SchemaColumn } from "udsv";
import { Op, Expr, compileFilter } from 'uexpr';

type HTMLElementEvent<T extends HTMLElement> = Event & {
  target: T;
}

interface Table {
  schema: Schema;
  data: string[][];

  // rows?: number[] | null;
  // cols?:

  // filters: (various matchers, uExpr)
  // sorters:
  // groupers:
  // faceters: (enum values)
}

interface CSVDropperProps {
  setData: (table: Table | null) => void;
}
type Sorter = [pos: number, colIdx: number, sortDir: number];
type TupleSortFn = (a: string[], b: string[]) => number;

const cmp = new Intl.Collator('en', { numeric: true, sensitivity: 'base' }).compare;

const compileSorterTuples = (cols: SchemaColumn[], pos: number[], dir: number[], simple = false): TupleSortFn | null => {
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

const compileMatcherStringTuples = (rules: Expr[]) => {
  let nonEmpty = rules.filter(r => r[2] != '');

  if (nonEmpty.length == 0)
    return null;

  // add null handling, maybe for strings uExpr should parse as '' and nums as 0?
  let rules2 = ['&&',
    ...nonEmpty.flatMap(r => [
        ['!==', r[1], null],
        r,
    ])
  ];

  // add uFuzzy, case insensitivity?

  // todo: make empty value acceptable, (isNull, falsy, cmp against explicit empty, etc)
  return compileFilter<string[]>(rules2);
};

const CSVDropper = component<CSVDropperProps>((c) => {
  let onDrop = (e: DragEvent) => {
    e.preventDefault();

    for (const item of e.dataTransfer!.items) {
      if (item.kind == "file") {
        let file = item.getAsFile()!;

        if (file.name.endsWith(".csv")) {
          file.text().then((text) => {
            console.time("parse");

            let s = inferSchema(text, {}, 100);

            // we dont need to parse dates except during display? they can be sorted by timestamp?
            s.cols.forEach(c => {
              if (c.type === 'd')
                  c.type = 's';
            });

            let p = initParser(s);
            // let d = p.stringArrs(text);
            let d = p.typedArrs(text);

            console.timeEnd("parse");

            getProps(c).setData({schema: s, data: d});
          });
        }
      }
    }
  };

  let onDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  return () => html`
    <div
      ~width="600px"
      ~height="600px"
      ~background="pink"
      ~user-select="none"
      @drop=${onDrop}
      @dragover=${onDragOver}
    >
      Drag/drop CSV here...
    </div>
  `;
});

const Table = component<Table>((c) => {
  let dom: HTMLElement;
  const setDom = (el: HTMLElement) => { dom = el; };

  let table = getProps(c);
  let cols = table.schema.cols;

  // this can come from url params? cookies?
  let filts: Expr[] = cols.map((c, ci) => ['*', `[${ci}]`, '']);
  let sortDir: number[] = Array(cols.length).fill(0);
  let sortPos: number[] = Array(cols.length).fill(0);

  // compiled fns
  let sortFn;
  let filtFn;

  let dataFilt = table.data;
  let dataSort = table.data;
  let data     = table.data; // final sorted, filtered, grouped

  let onClickCol = (idx: number) => {
    let dir = sortDir[idx];
    let pos = sortPos[idx];

    if (dir == 1)
      dir = -1;
    else if (dir == 0) {
      dir = 1;
      pos = Math.max(...sortPos) + 1;
    }
    else {
      for (let i = 0; i < sortPos.length; i++)
        if (sortPos[i] > pos)
          sortPos[i]--;

      dir = 0;
      pos = 0;
    }

    sortDir[idx] = dir;
    sortPos[idx] = pos;

    reSort();
  };

  let reFilt = () => {
    filtFn = compileMatcherStringTuples(filts);

    if (filtFn == null)
      dataFilt = table.data;
    else
      dataFilt = filtFn(table.data);

    reSort();
    invalidate(c);
  };

  let reSort = () => {
    sortFn = compileSorterTuples(cols, sortPos, sortDir, true);

    if (sortFn == null)
      data = dataSort = dataFilt;
    else
      data = dataSort = dataFilt.slice().sort(sortFn);

    // when to do this?
    dom.scrollTop = 0;

    invalidate(c);
  };

  let onChangeFiltOp = (idx: number, op: Op) => {
    filts[idx][0] = op;
    reFilt();
  };

  let onChangeFiltVal = (idx: number, val: string) => {
    filts[idx][2] = val;
    reFilt();
  };

  // approx row hgt to estimate how many to render based on viewport size
  let rowHgt = 0;
  let viewRows = 0;
  // min chunk length and used to estimate row height
  let chunkLen = Math.min(100, data.length);
  let idx0 = 0;
  let colWids = Array(cols.length).fill(null);

  const incrRoundDn = (num: number, incr: number) => Math.floor(num / incr) * incr;

  let sync = () => {
    let rFull = dom.getBoundingClientRect();
    let rThead = dom.querySelector('thead')!.getBoundingClientRect();
    let viewHgt = rFull.height - rThead.height;

    // set once during init from probed/rendered chunk
    if (rowHgt == 0) {
      let tbody = dom.querySelector('tbody')!;
      let rTbody = tbody.getBoundingClientRect();

      rowHgt = rTbody.height / chunkLen;

      let i = 0;
      for (let colEl of dom.querySelectorAll('.col-names th'))
        colWids[i++] = colEl.getBoundingClientRect().width;
    }

    viewRows = Math.floor(viewHgt / rowHgt);
    chunkLen = 2 * viewRows;

    // console.log(chunkLen);
  };

  let setIdx0 = (force = false) => {
    let idx1 = incrRoundDn(dom.scrollTop / rowHgt, viewRows);

    if (force || idx0 != idx1) {
      idx0 = idx1;
      invalidate(c);
    }
  };

  useEffect(c, () => {
    // TODO: ensure this is only for vt scroll and resize, and handle hz resize independently (adjust col widths? only when table width 100%?)
    dom.addEventListener('scroll', () => setIdx0());

    let resizeObserver = new ResizeObserver(() => {
      sync();
      setIdx0(true);
    });
    resizeObserver.observe(dom);

    return () => {
      resizeObserver.unobserve(dom);
      resizeObserver.disconnect();
    };
  })();

  let onClicks = cols.map((c, i) => () => onClickCol(i));
  let onChangeFiltOps = cols.map((c, i) => (e: HTMLElementEvent<HTMLSelectElement>) => onChangeFiltOp(i, e.target.value as Op));
  let onChangeFiltVals = cols.map((c, i) => (e: HTMLElementEvent<HTMLInputElement>) => onChangeFiltVal(i, e.target.value));

  return () => {
    let chunk = data.slice(idx0, idx0 + chunkLen);
    // TODO: this will only change with filters
    let totalHgt = data.length * rowHgt;

    let padTop = rowHgt == 0 ? 0 : idx0 * rowHgt;
    let padBtm = rowHgt == 0 ? 0 : totalHgt - Math.min(totalHgt, rowHgt * (idx0 + chunkLen));

    return html`
      <div class="scroll-wrap" ${setDom}>
        <table ~table-layout=${rowHgt > 0 ? 'fixed' : 'auto'}>
          <thead>
            <tr class="col-names">
              ${cols.map((c, i) => html`
                <th @click=${onClicks[i]} ~width=${rowHgt > 0 ? `${colWids[i]}px` : 'auto'}>
                  ${c.name}
                  ${sortDir[i] != 0 ? html`<span class="col-sort">${sortDir[i] == 1 ? `▲` : '▼'}<sup>${sortPos[i]}</sup></span>` : null}
                </th>
              `)}
            </tr>
            <tr class="col-filts">
              ${cols.map((c, ci) => html`
                <th>
                  <select @change=${onChangeFiltOps[ci]}>
                    <option title="Contains">*</option>
                    <option title="Starts with">^</option>
                    <option title="NOT Contains">!*</option>
                    <option title="NOT Starts with">!^</option>
                  </select>
                  <input type="text" placeholder="Filter..." @input=${onChangeFiltVals[ci]}/>
                </th>
              `)}
            </tr>
          </thead>
          <tbody>
            <tr ~height=${`${padTop}px`}/>
            ${chunk.map(row => html`
              <tr>
                ${row.map((col) => html`<td .textContent=${col}/>`)}
              </tr>
            `)}
            <tr ~height=${`${padBtm}px`}/>
          </tbody>
        </table>
      </div>
    `;
  }
});

const App = component((c) => {
  let [getData, setData] = useState<Table | null>(c, null);

  return () => {
    let table = getData();
    return table == null ? CSVDropper({ setData }) : Table(table);
  };
});

update(createRoot(document.body), App());