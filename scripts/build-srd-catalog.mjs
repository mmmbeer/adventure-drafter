import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
// Rebuild from the pinned source files documented in public/srd/README.md.
const source = resolve(process.argv[2] || "../srd-source");
const output = resolve("public/srd");
const read = (name) => readFile(resolve(source, name), "utf8");
const slug = (name) =>
  name
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
const plain = (text) =>
  text
    .replace(/[*_]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
const signed = (n) => (n >= 0 ? `+${n}` : String(n));
function entry(edition, kind, name, summary, markdown) {
  return {
    id: `${edition}-${kind}-${slug(name)}`,
    edition,
    kind,
    name,
    summary,
    markdown,
  };
}
function tableMarkdown(table) {
  const keys = Object.keys(table);
  const length = Math.max(...keys.map((k) => table[k].length));
  const cell = (value) =>
    String(value ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, "<br>");
  return [
    `| ${keys.map(cell).join(" | ")} |`,
    `| ${keys.map(() => "---").join(" | ")} |`,
    ...Array.from(
      { length },
      (_, i) => `| ${keys.map((k) => cell(table[k][i])).join(" | ")} |`,
    ),
  ].join("\n");
}
// Shoppe's tree format includes nested properties and tables. Keep every body
// section instead of the short description used by its storefront catalog.
function itemBody(value, depth = 3) {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.map((v) => itemBody(v, depth)).join("\n\n");
  if (!value || typeof value !== "object") return "";
  return Object.entries(value)
    .map(([key, child]) => {
      if (key === "content") return itemBody(child, depth);
      if (key === "table") return tableMarkdown(child);
      return `${"#".repeat(Math.min(depth, 6))} ${key}\n\n${itemBody(child, depth + 1)}`;
    })
    .join("\n\n");
}
async function items(edition) {
  let root = JSON.parse(await read(`items-${edition}.json`))["Magic Items"];
  root = root["Magic Items A–Z"] || root;
  const entries = { ...root, ...(root.Artifacts || {}) };
  return Object.entries(entries)
    .filter(
      ([, v]) =>
        Array.isArray(v?.content) &&
        typeof v.content[0] === "string" &&
        v.content[0].startsWith("*"),
    )
    .map(([name, original]) => {
      const body = { ...original, content: [...original.content] };
      const combined = /^(\*[^*]+\*)\s+(.+)$/s.exec(body.content[0]);
      if (combined) body.content.splice(0, 1, combined[1], combined[2]);
      return entry(
        edition,
        "items",
        name,
        plain(body.content[0]),
        itemBody(body) +
          (name === "Apparatus of the Crab" &&
          root["Apparatus of the Crab Levers"]
            ? `\n\n### Levers\n\n${itemBody(root["Apparatus of the Crab Levers"])}`
            : ""),
      );
    });
}
function usage(value) {
  if (!value) return "";
  if (value.type === "recharge on roll")
    return `Recharge ${value.min_value}–${value.dice?.replace("d", "") || 6}`;
  if (value.times)
    return `${value.times}/${value.type.replace(/^per /, "")}${value.times_in_lair ? ` (${value.times_in_lair} in lair)` : ""}`;
  return value.type || "";
}
function actions(values = []) {
  return values
    .map((a) => {
      const limit = usage(a.usage);
      return `**${a.name}${limit && !a.name.includes("(") ? ` (${limit})` : ""}.** ${a.desc}`;
    })
    .join("\n\n");
}
async function monsters2014() {
  const data = JSON.parse(await read("monsters-2014.json"));
  const keys = [
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
  ];
  return data.map((m) => {
    const classification = `${m.size} ${m.type}${m.subtype ? ` (${m.subtype})` : ""}, ${m.alignment}`;
    const cr =
      { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" }[m.challenge_rating] ||
      String(m.challenge_rating);
    const armor = m.armor_class
      .map(
        (a) =>
          `${a.value}${a.desc ? ` (${a.desc})` : a.spell ? ` (with ${a.spell.name})` : a.armor ? ` (${a.armor.map((x) => x.name).join(", ")})` : a.type === "natural" ? " (natural armor)" : ""}`,
      )
      .join("; ");
    const blocks = [
      `_${classification}_`,
      `**Armor Class** ${armor}`,
      `**Hit Points** ${m.hit_points} (${m.hit_points_roll})`,
      `**Speed** ${Object.entries(m.speed)
        .map(([k, v]) =>
          k === "hover"
            ? v
              ? "hover"
              : ""
            : `${k === "walk" ? "" : `${k} `}${v}`,
        )
        .filter(Boolean)
        .join(", ")}`,
      tableMarkdown(
        Object.fromEntries(
          keys.map((k) => [
            k.slice(0, 3).toUpperCase(),
            [`${m[k]} (${signed(Math.floor((m[k] - 10) / 2))})`],
          ]),
        ),
      ),
    ];
    for (const [prefix, label] of [
      ["saving-throw-", "Saving Throws"],
      ["skill-", "Skills"],
    ]) {
      const parts = m.proficiencies
        .filter((p) => p.proficiency.index.startsWith(prefix))
        .map(
          (p) =>
            `${p.proficiency.name.replace(/^(Saving Throw|Skill): /, "")} ${signed(p.value)}`,
        );
      if (parts.length) blocks.push(`**${label}** ${parts.join(", ")}`);
    }
    for (const [key, label] of [
      ["damage_vulnerabilities", "Damage Vulnerabilities"],
      ["damage_resistances", "Damage Resistances"],
      ["damage_immunities", "Damage Immunities"],
      ["condition_immunities", "Condition Immunities"],
    ])
      if (m[key]?.length)
        blocks.push(
          `**${label}** ${m[key].map((v) => (typeof v === "string" ? v : v.name)).join(", ")}`,
        );
    blocks.push(
      `**Senses** ${Object.entries(m.senses)
        .map(([key, value]) => `${key.replaceAll("_", " ")} ${value}`)
        .join(", ")}`,
      `**Languages** ${m.languages || "—"}`,
      `**Challenge** ${cr} (${m.xp.toLocaleString("en-US")} XP; PB ${signed(m.proficiency_bonus)})`,
    );
    for (const [key, label] of [
      ["special_abilities", "Traits"],
      ["actions", "Actions"],
      ["bonus_actions", "Bonus Actions"],
      ["reactions", "Reactions"],
      ["legendary_actions", "Legendary Actions"],
    ])
      if (m[key]?.length) {
        // The structured source omits this shared paragraph. Verified against
        // every legendary creature in the official SRD_CC_v5.1.pdf.
        const budget =
          key === "legendary_actions"
            ? "The creature has 3 legendary actions. Choose one option at the end of another creature’s turn, paying its stated action cost. All spent legendary actions return at the start of the creature’s turn.\n\n"
            : "";
        blocks.push(`### ${label}\n\n${budget}${actions(m[key])}`);
      }
    if (m.desc) blocks.push(`### Description\n\n${m.desc}`);
    return entry(
      "2014",
      "monsters",
      m.name,
      `${classification} · CR ${cr}`,
      blocks.join("\n\n"),
    );
  });
}
function normalizeAbilities(markdown) {
  return markdown.replace(/<table>[\s\S]*?<\/table>/gi, (html) => {
    const cells = [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      plain(m[1]),
    );
    if (
      cells.length !== 24 ||
      !["STR", "DEX", "CON", "INT", "WIS", "CHA"].every(
        (a, i) => cells[i * 4] === a,
      )
    )
      return html;
    const abilities = {},
      saves = [];
    for (let i = 0; i < cells.length; i += 4) {
      abilities[cells[i]] = [`${cells[i + 1]} (${cells[i + 2]})`];
      saves.push(`${cells[i]} ${cells[i + 3]}`);
    }
    return `${tableMarkdown(abilities)}\n\n**Saving Throws** ${saves.join(", ")}`;
  });
}
async function monsters2024() {
  const all = [];
  for (const file of ["monsters-2024.md", "animals-2024.md"]) {
    const raw = await read(file);
    const headers = [...raw.matchAll(/^#{2,3} (.+)$/gm)];
    for (let i = 0; i < headers.length; i++) {
      const name = headers[i][1].trim();
      let body = raw
        .slice(
          headers[i].index + headers[i][0].length,
          headers[i + 1]?.index ?? raw.length,
        )
        .trim();
      if (
        !/^_[^\n]+_/.test(body) ||
        !body.includes("**AC**") ||
        !body.includes("**HP**")
      )
        continue;
      const classification = plain(body.split("\n")[0]);
      const cr = body.match(/\*\*CR\*\*\s+([\d/]+)/)?.[1] || "?";
      body = normalizeAbilities(body)
        .replace(/<br\s*\/?\s*>/gi, "\n\n")
        .replace(/<hr\s*\/?\s*>/gi, "")
        .replace(/^#### /gm, "### ")
        .replace(/\*\*AC\*\*/g, "**Armor Class**")
        .replace(/\s+\*\*Initiative\*\*/g, "\n\n**Initiative**")
        .replace(/\*\*HP\*\*/g, "**Hit Points**")
        .replace(/\*\*CR\*\*/g, "**Challenge**");
      all.push(
        entry("2024", "monsters", name, `${classification} · CR ${cr}`, body),
      );
    }
  }
  return all;
}
await mkdir(output, { recursive: true });
const catalogs = {
  "2014-items": await items("2014"),
  "2024-items": await items("2024"),
  "2014-monsters": await monsters2014(),
  "2024-monsters": await monsters2024(),
};
for (const [name, entries] of Object.entries(catalogs)) {
  entries.sort((a, b) => a.name.localeCompare(b.name));
  if (new Set(entries.map((e) => e.id)).size !== entries.length)
    throw new Error(`Duplicate ID: ${name}`);
  if (entries.length < 200) throw new Error(`Incomplete catalog: ${name}`);
  await writeFile(
    resolve(output, `${name}.json`),
    JSON.stringify(entries, null, 2) + "\n",
  );
  console.log(`${name}: ${entries.length} entries`);
}
