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


/*
// to avoid setting col-specific styles on each cell, generate and manage an associated stylesheet for this specific table id

#table123 tbody td:nth-child(5) {
  text-align: right;
  background: silver;
}

var style = document.createElement('style');
document.head.appendChild(style);
var styleSheet = style.sheet // Will give you the associated CSSStyleSheet
*/