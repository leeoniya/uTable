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
      <th>JS Framework</th>
      <td><a href="https://github.com/localvoid/ivi">ivi</a></td>
      <td><a href="https://github.com/solidjs/solid">SolidJS</a></td>
    </tr>
    <tr>
      <th>CSV Parsing</th>
      <td><a href="https://github.com/leeoniya/uDSV">μDSV</a></td>
      <td><a href="https://github.com/uwdata/arquero/blob/main/src/format/parse/parse-delimited.js">Arquero (d3-dsv)</a></td>
    </tr>
    <tr>
      <th>Virtualization</th>
      <td>own (&lt; 0.5 KB)</td>
      <td><a href="https://github.com/tanstack/table">TanStack/table</a> <a href="https://bundlephobia.com/package/@tanstack/solid-table@8.11.2">(~60 KB)</a></td>
    </tr>
    <tr>
      <th>Sorting / filtering</th>
      <td>own (&lt; 0.5 KB)</td>
      <td><a href="https://github.com/uwdata/arquero">Arquero <a hfref="https://bundlephobia.com/package/arquero@5.4.0">(~400 KB)</a></td>
    </tr>
    <tr>
      <th>localStorage Persistence</th>
      <td>no</td>
      <td>yes</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th>Bundle size</th>
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
### Performance

---
### Installation

---
### Basic Usage
