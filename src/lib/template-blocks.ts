import type { JSONContent } from "@tiptap/core";
import { heading, paragraph, text } from "./documents";

export const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const baseScores = [10, 10, 10, 10, 10, 10];
export type TemplateKind = "creature" | "magicItem" | "readaloud" | "aside" | "encounter" | "treasure";
export type TemplateFields = Record<string, string>;

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
function role(node: JSONContent, index: number, kind: string): string {
  if (node.attrs?.templateField) return node.attrs.templateField;
  if (node.type === "table" && kind === "creature") return "abilities";
  if (index === 0 && node.type === "heading") return "name";
  if (kind === "magicItem")
    return ["", "classification", "attunement", "description"][index] ?? "";
  if (kind !== "creature") return ["", "body"][index] ?? "";
  if (index === 1) return "classification";
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
    const key = role(part, index, kind);
    if (key && key !== "abilities") values[key] = nodeText(part);
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
export function patchTemplate(node: JSONContent, values: TemplateFields): JSONContent {
  const kind = node.attrs?.kind ?? "creature";
  const seen = new Set<string>();
  const nodes: JSONContent[] = [];
  (node.content ?? []).forEach((part, index) => {
    const key = role(part, index, kind);
    if (key === "oldAbilities") return;
    if (key === "abilities" && kind === "creature") {
      seen.add(key);
      nodes.push(abilityTable(values));
    } else if (key && values[key] !== undefined) {
      seen.add(key);
      // Replacing only standard fields leaves custom sections and paragraphs intact.
      nodes.push(field({ ...part, content: values[key] ? [text(values[key])] : [] }, key));
    } else nodes.push(part);
  });
  const required = kind === "creature"
    ? ["classification", "armor", "hitPoints", "speed", "abilities", "senses", "languages", "challenge"]
    : kind === "magicItem"
      ? ["classification", "attunement", "description", "properties"]
      : ["body"];
  // Insert missing standard fields without discarding user-created content.
  let at = Math.min(nodes.length, 2);
  for (const key of required) {
    if (seen.has(key) || !values[key] && key !== "abilities") continue;
    nodes.splice(at, 0, key === "abilities"
      ? abilityTable(values)
      : field(paragraph(values[key]), key));
    at++;
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
