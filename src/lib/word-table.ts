import {
  Table,
  TableCell,
  TableRow,
  TableLayoutType,
  WidthType,
  VerticalAlign,
  Paragraph,
} from "docx";
import { twips, wordBorders, wordFill } from "./word-format";

type Convert = (
  element: HTMLElement,
  width: number,
) => Promise<(Paragraph | Table)[]>;

/** Native editable table cells with the same proportions and merged spans. */
export async function wordTable(
  element: HTMLTableElement,
  width: number,
  paper: string,
  convert: Convert,
) {
  const sourceRows = [...element.rows];
  const occupied: number[] = [];
  const grid = sourceRows.map((row, rowIndex) => {
    let column = 0;
    return [...row.cells].map((cell) => {
      while ((occupied[column] || 0) > rowIndex) column++;
      const start = column;
      for (let offset = 0; offset < cell.colSpan; offset++)
        occupied[column++] = rowIndex + Math.max(1, cell.rowSpan);
      return { cell, column: start };
    });
  });
  const count = Math.max(1, occupied.length);
  const widths = Array.from({ length: count }, () => width / count);
  // The resizable editor's colgroup is the source of truth for column ratios.
  const columns = [
    ...element.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col"),
  ];
  const measured = columns.map(
    (column) =>
      column.getBoundingClientRect().width || parseFloat(column.style.width),
  );
  const total = measured.reduce((sum, value) => sum + (value || 0), 0);
  if (columns.length === count && total > 0)
    measured.forEach(
      (value, index) => (widths[index] = (width * value) / total),
    );
  const rows: TableRow[] = [];
  let leadingHeaders = true;
  for (const [rowIndex, row] of sourceRows.entries()) {
    const cells: TableCell[] = [];
    for (const { cell, column } of grid[rowIndex]) {
      const css = getComputedStyle(cell);
      const cellWidth = widths
        .slice(column, column + cell.colSpan)
        .reduce((sum, n) => sum + n, 0);
      const children = (
        await Promise.all(
          [...cell.children].map((child) =>
            convert(
              child as HTMLElement,
              Math.max(
                1,
                cellWidth -
                  (parseFloat(css.paddingLeft) || 0) -
                  (parseFloat(css.paddingRight) || 0),
              ),
            ),
          ),
        )
      ).flat();
      cells.push(
        new TableCell({
          children: children.length ? children : [new Paragraph("")],
          columnSpan: cell.colSpan,
          rowSpan: cell.rowSpan,
          width: { size: twips(cellWidth), type: WidthType.DXA },
          borders: wordBorders(css, paper),
          shading:
            wordFill(css, paper) || wordFill(getComputedStyle(row), paper),
          margins: {
            top: twips(css.paddingTop),
            bottom: twips(css.paddingBottom),
            left: twips(css.paddingLeft),
            right: twips(css.paddingRight),
          },
          verticalAlign:
            css.verticalAlign === "middle"
              ? VerticalAlign.CENTER
              : VerticalAlign.TOP,
        }),
      );
    }
    leadingHeaders =
      leadingHeaders && [...row.cells].every((cell) => cell.tagName === "TH");
    rows.push(
      new TableRow({
        children: cells,
        tableHeader: leadingHeaders,
        cantSplit: true,
      }),
    );
  }
  const css = getComputedStyle(element);
  return new Table({
    rows,
    width: { size: twips(width), type: WidthType.DXA },
    columnWidths: widths.map(twips),
    layout: TableLayoutType.FIXED,
    borders: wordBorders(css, paper),
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
}
