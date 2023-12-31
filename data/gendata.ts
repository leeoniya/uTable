import fs from 'fs';

const random = (max: number) => Math.round(Math.random() * 1000) % max;
const A = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const C = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const N = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

let nextId = 0;
function buildData(count: number) {
  const data: string[] = [
    'id,adjective,color,noun'
  ];

  for (let i = 0; i < count; i++)
    data.push(`${nextId++},${A[random(A.length)]},${C[random(C.length)]},${N[random(N.length)]}`);
  return data.join('\n');
}

let recs = buildData(3e5);

fs.writeFileSync('./table.csv', recs);