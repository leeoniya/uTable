import { html, component, getProps, invalidate, useEffect, List } from "ivi";
import type { Schema } from "udsv";
import { Expr, Op } from "uexpr";
import { clamp, compileMatcherStringTuples, compileSorterTuples, haltEvent, offWinCap, onWinCap } from "./utils.js";

type HTMLElementEvent<T extends HTMLElement> = Event & {
  target: T;
}

export interface Table {
  schema: Schema;
  data: string[][];

  // rows?: number[] | null;
  // cols?:

  // filters: (various matchers, uExpr)
  // sorters:
  // groupers:
  // faceters: (enum values)
}

export const Table = component<Table>((c) => {
  let dom: HTMLElement;
  const setDom = (el: HTMLElement) => { dom = el; };

  let table = getProps(c);
  let cols = table.schema.cols;

  // this can come from url params? cookies?
  let filts: Expr[] = cols.map((c, ci) => ['*', `[${ci}]`, '']);
  let sortDir: number[] = Array(cols.length).fill(0);
  let sortPos: number[] = Array(cols.length).fill(0);

  let dataFilt = table.data;
  let dataSort = table.data;

  let onClickCol = (idx: number, shiftKey: boolean) => {
    let dir = sortDir[idx];
    let pos = sortPos[idx];

    if (dir == 1)
      dir = -1;
    else if (dir == 0) {
      if (!shiftKey) {
        // reset all sorts
        sortPos.fill(0);
        sortDir.fill(0);
      }

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
    dataFilt = compileMatcherStringTuples(filts)(table.data);
    reSort();
  };

  let reSort = () => {
    let sortFn = compileSorterTuples(cols, sortPos, sortDir);

    if (sortFn == null)
      dataSort = dataFilt;
    else
      dataSort = dataFilt.slice().sort(sortFn);

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
  let chunkLen = Math.min(100, table.data.length);
  let idx0 = 0;
  let colWids = Array(cols.length).fill(null);

  let overscanRows = 15;

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
        colWids[i++] = clamp(colEl.getBoundingClientRect().width, min, max);
    }

    viewRows = Math.floor(viewHgt / rowHgt);
    chunkLen = viewRows + 2 * overscanRows;

    // console.log(chunkLen);
  };

  let setIdx0 = (force = false) => {
    let idx1 = Math.max(0, incrRoundDn(dom.scrollTop / rowHgt, overscanRows));

    if (force || idx0 != idx1) {
      idx0 = idx1;
      invalidate(c);
    }
  };

  // useLayoutEffect(c, () => {
  //   for (let colEl of dom.querySelectorAll('.col-names th'))
  //     console.log(colEl.getBoundingClientRect().width);
  // })();

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

  let onClicks = cols.map((c, i) => (e: MouseEvent) => onClickCol(i, e.shiftKey));
  let onChangeFiltOps = cols.map((c, i) => (e: HTMLElementEvent<HTMLSelectElement>) => onChangeFiltOp(i, e.target.value as Op));
  let onChangeFiltVals = cols.map((c, i) => (e: HTMLElementEvent<HTMLInputElement>) => onChangeFiltVal(i, e.target.value));

  // todo: make configurable per column
  const min = 50;
  const max = 500;

  let onDowns = cols.map((col, i) => (e: MouseEventInit) => {
    if (e.button !== 0)
      return;

    let fromX = e.clientX!;
    let fromWid = colWids[i];

    let onMove: EventListener = (e: MouseEventInit) => {
      let newWid = fromWid + (e.clientX! - fromX);

      // clamp
      if (newWid > max || newWid < min)
        return;

      // ensure non-zero here

      colWids[i] = newWid;

      // TODO: invaldate only header component, or just th component?
      invalidate(c);
    };

    let onClick: EventListener = (e: MouseEventInit) => {
      offWinCap('mousemove', onMove);
      offWinCap('click', onClick);
      haltEvent(e as Event);
    };

    onWinCap('mousemove', onMove);
    onWinCap('click', onClick);
    haltEvent(e as Event);
  });

  const Row  = component<string[]>((c) => row => html`<tr>${row.map(Cell)}</tr>`, () => true);
  const Cell = component<string  >((c) => col => html`<td tabindex="0" .textContent=${col}/>`, () => true);

  // col resize/drag
  // let onMouseDowns = cols.map((c, i) => (e: MouseEvent) => onClickCol(i, e.shiftKey));

  // 1fr 1fr max-content
  let gridTplCols = cols.map(c => '1fr').join(' ');

  // // to avoid setting col-specific styles on each cell, generate and manage an associated stylesheet for this specific table id
  // let style = document.createElement('style');
  // document.head.appendChild(style);
  // let sheet = style.sheet!;

  // cols.forEach((c, i) => {
  //   sheet.insertRule(`#snafu tbody td:nth-child(${i+1}) { color: pink; text-align: right; }`, i);
  // });

  return () => {
    let chunk = dataSort.slice(idx0, idx0 + chunkLen);
    // TODO: this will only change with filters
    let totalHgt = dataSort.length * rowHgt;

    let padTop = rowHgt == 0 ? 0 : idx0 * rowHgt;
    let padBtm = rowHgt == 0 ? 0 : totalHgt - Math.min(totalHgt, rowHgt * (idx0 + chunkLen));

    return html`
      <div class="scroll-wrap" ${setDom}>
        <table id="snafu" ~grid-template-columns=${gridTplCols}>
          <thead>
            <tr class="col-names">
              ${cols.map((c, i) => html`
                <th @click=${onClicks[i]} ~min-width=${`${min}px`} ~max-width=${`${max}px`} ~width=${rowHgt > 0 ? `${colWids[i]}px` : 'auto'} tabindex="0">
                  <div class="col-resize" @mousedown=${onDowns[i]} />
                  ${c.name}
                  ${sortDir[i] != 0 ? html`<span class="col-sort">${sortDir[i] == 1 ? `▲` : '▼'}<sup>${sortPos[i]}</sup></span>` : null}
                </th>
              `)}
            </tr>
            <tr class="col-filts">
              ${cols.map((c, ci) => html`
                <th tabindex="0">
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
            ${List(chunk, row => row, Row)}
            <tr ~height=${`${padBtm}px`}/>
          </tbody>
        </table>
      </div>
    `;
  }
});