## 𝌠 μTable

A tiny, fast UI for viewing, sorting, and filtering CSVs _(MIT Licensed)_

---
### Introduction

μTable is a fast interface for viewing CSV files.
It draws much inspiration from [thoughtspile/hippotable](https://github.com/thoughtspile/hippotable), but makes different tech choices with the goal of being smaller and faster.

<table>
  <thead>
    <tr>
      <th></th>
      <th>μTable</th>
      <th>Hippotable</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th align="left">JS Framework</th>
      <td><a href="https://github.com/localvoid/ivi">ivi</a></td>
      <td><a href="https://github.com/solidjs/solid">SolidJS</a></td>
    </tr>
    <tr>
      <th align="left">CSV Parsing</th>
      <td><a href="https://github.com/leeoniya/uDSV">μDSV</a></td>
      <td><a href="https://github.com/uwdata/arquero/blob/main/src/format/parse/parse-delimited.js">Arquero (d3-dsv)</a></td>
    </tr>
    <tr>
      <th align="left">Virtualization</th>
      <td>own (&lt; 0.5 KB)</td>
      <td><a href="https://github.com/tanstack/table">TanStack/table</a> <a href="https://bundlephobia.com/package/@tanstack/solid-table@8.11.2">(~60 KB)</a></td>
    </tr>
    <tr>
      <th align="left">Sorting / filtering</th>
      <td>own (&lt; 0.5 KB)</td>
      <td><a href="https://github.com/uwdata/arquero">Arquero</a> <a href="https://bundlephobia.com/package/arquero@5.4.0">(~400 KB)</a></td>
    </tr>
    <tr>
      <th align="left">localStorage Persistence</th>
      <td>no</td>
      <td>yes</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th align="left">Bundle size</th>
      <td>16 KB</td>
      <td>416 KB</td>
    </tr>
  </tfoot>
</table>

Both projects are very early, and the choices made by Hippotable are totally sensible, considering its plans to leverage much more of the Arquero library.
I have, however, previously tested some Arquero functions (such as grouping) and found its performance to be lacking in multiple areas.
This project has similar aspirations to Hippotable, but with greater scruitiny on external dependencies, and will always roll its own solutions when there are significant performance and/or size benefits.

---
### Features

---
### How to use

**Statically hosted:**

1. Open https://leeoniya.github.io/uTable
2. Drag/drop a CSV file into the UI

**Locally or dev:**

1. Clone this repo
2. Install dependencies: `npm install`
3. Build bundle: `npm run build`
4. Run an http server in repo root that can serve static files, for example:
  1. Install: `npm i -g http-server`
  2. Run `http-server` in repo root
5. Open `http://localhost:8080/`
6. Drag/drop a CSV file into the UI

```
npm i
```

---
### Performance