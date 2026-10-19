import type { JSONContent } from "@tiptap/core";
import { heading, paragraph, text } from "./documents";

export const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const baseScores = [10, 10, 10, 10, 10, 10];
export type TemplateKind = "creature" | "magicItem" | "readaloud" | "aside" | "encounter" | "treasure";
export type TemplateFields = Record<string, string>;
export type RichTemplateFields = Record<string, JSONContent[]>;

function field(node: JSONContent, key: string): JSONContent {
  return { ...node, attrs: { ...node.attrs, templateField: key } };
}
function score(value: string): number {
  const number = parseInt(value, 10);
  return Number.isFinite(number) ? Math.min(30, Math.max(1, number)) : 10;
}
export function modifier(value: string) {
  const mod = Math.floor((score(value) - 10) / 2);
  return `${mod < 0 ? "" : "+"}${mod}`;
}
export function abilityTable(values: TemplateFields = {}): JSONContent {
  return field({
    type: "table",
    content: [
      { type: "tableRow", content: abilities.map((a) => ({
        type: "tableHeader", content: [paragraph(a)],
      })) },
      { type: "tableRow", content: abilities.map((a, i) => ({
        type: "tableCell",
        content: [paragraph(`${score(values[a.toLowerCase()] ?? String(baseScores[i]))} (${modifier(values[a.toLowerCase()] ?? String(baseScores[i]))})`)],
      })) },
    ],
  }, "abilities");
}
function creature(): JSONContent {
  return {
    type: "statBlock", attrs: { kind: "creature", width: 100, flow: "block" },
    content: [
      field(heading("Creature name", 2), "name"),
      field(paragraph("Medium humanoid, unaligned"), "classification"),
      field(paragraph("Armor Class 12"), "armor"),
      field(paragraph("Hit Points 22 (4d8 + 4)"), "hitPoints"),
      field(paragraph("Speed 30 ft."), "speed"),
      abilityTable({ str: "12", dex: "14", con: "12", int: "10", wis: "12", cha: "10" }),
      field(paragraph("Senses passive Perception 10"), "senses"),
      field(paragraph("Languages Common"), "languages"),
      field(paragraph("Challenge 1 (200 XP)"), "challenge"),
      heading("Traits", 3),
      field(paragraph("Trait. Describe the creature's signature ability."), "traits"),
      heading("Actions", 3),
      field(paragraph("Attack. +4 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) damage."), "actions"),
    ],
  };
}
function magicItem(): JSONContent {
  return {
    type: "statBlock", attrs: { kind: "magicItem", width: 100, flow: "block" },
    content: [
      field(heading("Magic item name", 2), "name"),
      field(paragraph("Wondrous item, uncommon"), "classification"),
      field(paragraph("Requires attunement"), "attunement"),
      field(paragraph("Describe its appearance and history."), "description"),
      heading("Properties", 3),
      field(paragraph("Property. Describe what the item does."), "properties"),
    ],
  };
}
const titles: Record<string, string> = {
  readaloud: "Read aloud", aside: "Game Master’s notes",
  encounter: "Encounter", treasure: "Treasure",
};
export function makeTemplate(kind: TemplateKind): JSONContent {
  if (kind === "creature") return creature();
  if (kind === "magicItem") return magicItem();
  return {
    type: "callout", attrs: { kind, width: 100, flow: "block" },
    content: [
      field(heading(titles[kind], 3), "name"),
      field(paragraph("Write here…"), "body"),
    ],
  };
}
function nodeText(node: JSONContent): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(nodeText).join(" ");
}
function role(node: JSONContent, index: number, kind: string, siblings: JSONContent[]): string {
  if (node.attrs?.templateField) return node.attrs.templateField;
  if (node.type === "table" && kind === "creature") return "abilities";
  if (index === 0 && node.type === "heading") return "name";
  if (kind === "magicItem")
    return ["", "classification", "attunement", "description"][index] ?? "";
  if (kind !== "creature") return ["", "body"][index] ?? "";
  if (index === 1) return "classification";
  const before = index ? nodeText(siblings[index - 1]).trim().toLowerCase() : "";
  if (before === "traits") return "traits";
  if (before === "actions") return "actions";
  const value = nodeText(node).toLowerCase();
  if (value.startsWith("armor class")) return "armor";
  if (value.startsWith("hit points")) return "hitPoints";
  if (value.startsWith("speed")) return "speed";
  if (value.startsWith("senses")) return "senses";
  if (value.startsWith("languages")) return "languages";
  if (value.startsWith("challenge")) return "challenge";
  if (value.startsWith("str ") && value.includes("dex")) return "oldAbilities";
  return "";
}
export function templateFields(node: JSONContent): TemplateFields {
  const kind = node.attrs?.kind ?? "creature";
  const values: TemplateFields = {};
  (node.content ?? []).forEach((part, index) => {
    const key = role(part, index, kind, node.content ?? []);
    if (key && key !== "abilities")
      values[key] = values[key] ? `${values[key]}\n${nodeText(part)}` : nodeText(part);
    if (key === "abilities") {
      (part.content?.[1]?.content ?? []).forEach((cell, i) => {
        if (abilities[i]) values[abilities[i].toLowerCase()] = String(score(nodeText(cell)));
      });
    }
  });
  // Accept the older one-line ability scores from manually authored blocks.
  if (values.oldAbilities) {
    const matches = [...values.oldAbilities.matchAll(/(STR|DEX|CON|INT|WIS|CHA)\s+(\d+)/gi)];
    for (const [, key, value] of matches) values[key.toLowerCase()] = value;
  }
  // Older imported stat blocks may combine armor, hit points and speed.
  if (values.armor?.includes("•")) {
    const parts = values.armor.split("•").map((v) => v.trim());
    values.armor = parts[0];
    values.hitPoints ||= parts.find((p) => /^hit points/i.test(p)) || "";
    values.speed ||= parts.find((p) => /^speed/i.test(p)) || "";
  }
  return values;
}
/** Load formatted field blocks, including paragraphs added by the modal. */
export function templateRichFields(node: JSONContent): RichTemplateFields {
  const kind = node.attrs?.kind ?? "creature";
  const allowed = new Set(templateLabels(kind).filter((item) => item.multiline).map((item) => item.key));
  const result: RichTemplateFields = {};
  (node.content ?? []).forEach((part, index) => {
    const key = role(part, index, kind, node.content ?? []);
    if (!allowed.has(key)) return;
    const attrs = { ...(part.attrs ?? {}) };
    delete attrs.templateField;
    const { attrs: _fieldAttrs, ...clean } = part;
    (result[key] ??= []).push(Object.keys(attrs).length ? { ...clean, attrs } : clean);
  });
  return result;
}

export function patchTemplate(
  node: JSONContent, values: TemplateFields, rich: RichTemplateFields = {},
): JSONContent {
  const kind = node.attrs?.kind ?? "creature";
  const seen = new Set<string>();
  const original = templateFields(node);
  const nodes: JSONContent[] = [];
  (node.content ?? []).forEach((part, index) => {
    const key = role(part, index, kind, node.content ?? []);
    if (key === "oldAbilities") return;
    if (rich[key]) {
      // Multiple formatted paragraphs/lists share the same semantic field.
      // Replace the entire field only once, retaining unrelated custom blocks.
      if (!seen.has(key)) nodes.push(...rich[key].map((block) => field(block, key)));
      seen.add(key);
    } else if (key === "abilities" && kind === "creature") {
      seen.add(key);
      nodes.push(abilityTable(values));
    } else if (key && values[key] !== undefined) {
      // Preserve every formatted paragraph belonging to an unchanged field.
      // Only consolidate multiple blocks when the user changes the plain value.
      if (original[key] === values[key]) nodes.push(part);
      else if (!seen.has(key))
        nodes.push(field({ ...part, content: values[key] ? [text(values[key])] : [] }, key));
      seen.add(key);
    } else nodes.push(part);
  });
  const required = node.attrs?.srdContinuation ? [] : kind === "creature"
    ? ["classification", "armor", "hitPoints", "speed", "abilities", "senses", "languages", "challenge"]
    : kind === "magicItem"
      ? ["classification", "attunement", "description", "properties"]
      : ["body"];
  // Insert missing standard fields without discarding user-created content.
  const order = ["name", ...required];
  for (const key of required) {
    if (seen.has(key) || (!values[key] && !rich[key]?.some((part) => nodeText(part).trim()) && key !== "abilities")) continue;
    if (key === "abilities" && node.attrs?.srdId && !original.str) continue;
    const preceding = [...order.slice(0, order.indexOf(key))].reverse();
    const anchor = preceding.map((name) =>
      nodes.findIndex((part) => part.attrs?.templateField === name ||
        (name === "name" && part.type === "heading" && nodes.indexOf(part) === 0))
    ).find((index) => index !== -1);
    const at = anchor === undefined ? Math.min(nodes.length, 2) : anchor + 1;
    nodes.splice(at, 0, ...(rich[key]
      ? rich[key].map((block) => field(block, key))
      : [key === "abilities" ? abilityTable(values) : field(paragraph(values[key]), key)]));
    seen.add(key);
  }
  if (kind === "creature") {
    for (const { key, label } of templateLabels(kind).filter((item) => item.multiline)) {
      if (seen.has(key) || (!values[key]?.trim() && !rich[key]?.some((part) => nodeText(part).trim()))) continue;
      nodes.push(heading(label, 3), ...(rich[key]
        ? rich[key].map((block) => field(block, key))
        : [field(paragraph(values[key]), key)]));
    }
  }
  return { ...node, content: nodes };
}
export function templateLabels(kind: string): { key: string; label: string; multiline?: boolean }[] {
  if (kind === "creature") return [
    { key: "name", label: "Creature name" },
    { key: "classification", label: "Size, type and alignment" },
    { key: "armor", label: "Armor Class" },
    { key: "hitPoints", label: "Hit Points" },
    { key: "speed", label: "Speed" },
    ...abilities.map((ability) => ({ key: ability.toLowerCase(), label: ability })),
    { key: "senses", label: "Senses" },
    { key: "languages", label: "Languages" },
    { key: "challenge", label: "Challenge" },
    { key: "traits", label: "Traits", multiline: true },
    { key: "actions", label: "Actions", multiline: true },
    { key: "bonusActions", label: "Bonus actions", multiline: true },
    { key: "reactions", label: "Reactions", multiline: true },
    { key: "legendaryActions", label: "Legendary actions", multiline: true },
  ];
  if (kind === "magicItem") return [
    { key: "name", label: "Item name" },
    { key: "classification", label: "Type and rarity" },
    { key: "attunement", label: "Attunement" },
    { key: "description", label: "Description", multiline: true },
    { key: "properties", label: "Properties", multiline: true },
  ];
  return [
    { key: "name", label: "Heading" },
    { key: "body", label: "Text", multiline: true },
  ];
}
