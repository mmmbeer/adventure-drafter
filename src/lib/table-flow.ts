import type { JSONContent } from "@tiptap/core";

/** Only complete leading header rows repeat, never a row-heading body cell. */
export function tableHeaderCount(table: JSONContent) {
  let count = 0;
  for (const row of table.content ?? []) {
    if (
      !row.content?.length ||
      !row.content.every((cell) => cell.type === "tableHeader")
    )
      break;
    count++;
  }
  return count;
}

/** A row-spanning cell must remain in the same fragment as every row it spans. */
export function tableCuts(table: JSONContent) {
  const rows = table.content ?? [];
  const headers = tableHeaderCount(table);
  const cuts: number[] = [];
  let end = 0;
  for (let i = 0; i < rows.length - 1; i++) {
    for (const cell of rows[i].content ?? [])
      end = Math.max(end, i + Math.max(1, Number(cell.attrs?.rowspan) || 1));
    const cut = i + 1;
    if (cut > headers && cut >= end) cuts.push(cut);
  }
  // A repeating header that spans body rows cannot be copied safely.
  if (
    rows
      .slice(0, headers)
      .some((row, i) =>
        row.content?.some(
          (cell) => i + Number(cell.attrs?.rowspan ?? 1) > headers,
        ),
      )
  )
    return [];
  return cuts;
}

export function splitTable(
  table: JSONContent,
  cut: number,
): [JSONContent, JSONContent] | null {
  if (table.type !== "table" || !tableCuts(table).includes(cut)) return null;
  const rows = table.content ?? [];
  const flowGroup = table.attrs?.flowGroup || crypto.randomUUID();
  const attrs = { ...table.attrs, flowGroup };
  return [
    { ...table, attrs, content: rows.slice(0, cut) },
    {
      ...table,
      attrs,
      content: [...rows.slice(0, tableHeaderCount(table)), ...rows.slice(cut)],
    },
  ];
}

export function tableLayoutKey(table: JSONContent) {
  const { refId: _refId, ...attrs } = table.attrs ?? {};
  return JSON.stringify({ ...table, attrs });
}

export function joinTables(
  left: JSONContent,
  right: JSONContent,
): JSONContent | null {
  if (
    left.type !== "table" ||
    right.type !== "table" ||
    !left.attrs?.flowGroup ||
    left.attrs.flowGroup !== right.attrs?.flowGroup ||
    tableLayoutKey({ ...left, content: [] }) !==
      tableLayoutKey({ ...right, content: [] })
  )
    return null;
  const count = tableHeaderCount(left);
  if (
    count !== tableHeaderCount(right) ||
    JSON.stringify(left.content?.slice(0, count)) !==
      JSON.stringify(right.content?.slice(0, count))
  )
    return null;
  return {
    ...left,
    content: [...(left.content ?? []), ...(right.content ?? []).slice(count)],
  };
}
