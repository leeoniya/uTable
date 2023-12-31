import { update, component, getProps, createRoot, useState, invalidate, useEffect } from "ivi";
import { htm as html } from "@ivi/htm";
import { Schema, inferSchema, initParser } from "udsv";

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

const compileSorterStringTuples = (pos: number[], dir: number[], simple = false): TupleSortFn | null => {
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
    let a = `a[${s[1]}]`;
    let b = `b[${s[1]}]`;

    return simple ?
      `${s[2]} * (${a} > ${b} ? 1 : ${a} < ${b} ? -1 : 0)` :
      `${s[2]} * cmp(${a}, ${b})`
  }).join(' || ');

  return new Function('cmp', `
    return (a, b) => ${body};
  `)(cmp);
};

const CSVDropper = component<CSVDropperProps>((c) => {
  let onDrop = (e: DragEvent) => {
    e.preventDefault();

    for (const item of e.dataTransfer!.items) {
      if (item.kind == "file") {
        let file = item.getAsFile()!;

        if (file.name.endsWith(".csv")) {
          file.text().then((text) => {
            // console.time("parse");

            let s = inferSchema(text);
            let p = initParser(s);
            let d = p.stringArrs(text);

            // console.timeEnd("parse");

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

  // let sortedIdxs = table.data.map((r, i) => i);

  // sorted, filtered, etc.
  let data = table.data;


  let sortDir: number[] = Array(100).fill(0);
  let sortPos: number[] = Array(100).fill(0);

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

    let sortFn = compileSorterStringTuples(sortPos, sortDir, true);

    if (sortFn == null)
      data = table.data;
    else
      data = table.data.slice().sort(sortFn);

    invalidate(c);
  };

  // filtered /sorted idxs?

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
    let tbody = dom.querySelector('tbody')!;
    let rTbody = tbody.getBoundingClientRect();
    let viewHgt = rFull.height - rThead.height;

    // set once during init from probed/rendered chunk
    if (rowHgt == 0) {
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
              ${cols.map(c => html`
                <th>
                  <select>
                    <option>==</option>
                    <option>^</option>
                  </select>
                  <input type="text" placeholder="Filter..."/>
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