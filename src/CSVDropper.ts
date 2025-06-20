import { html, component, getProps } from "ivi";
import { inferSchema, initParser } from "udsv";
import { Table } from "./Table.js";

interface CSVDropperProps {
  setData: (table: Table | null) => void;
}

export const CSVDropper = component<CSVDropperProps>((c) => {
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