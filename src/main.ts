import { update, component, createRoot, useState, } from "ivi";
import { Table } from "./Table.js";
import { CSVDropper } from "./CSVDropper.js";

const App = component((c) => {
  let [getData, setData] = useState<Table | null>(c, null);

  return () => {
    let table = getData();
    return table == null ? CSVDropper({ setData }) : Table(table);
  };
});

update(createRoot(document.body), App());