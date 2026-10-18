import { describe, expect, it } from "vitest";
import {
  abilityTable, makeTemplate, modifier, patchTemplate, templateFields,
} from "../src/lib/template-blocks";
import { heading, paragraph } from "../src/lib/documents";

describe("semantic layout templates", () => {
  it("makes a six-column D&D ability table with centered-score source content", () => {
    const table = abilityTable({ str: "18", dex: "8", con: "10", int: "13", wis: "16", cha: "1" });
    expect(table.attrs?.templateField).toBe("abilities");
    expect(table.content?.[0].content?.map((cell) => cell.content?.[0].content?.[0].text))
      .toEqual(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
    expect(table.content?.[1].content?.map((cell) => cell.content?.[0].content?.[0].text))
      .toEqual(["18 (+4)", "8 (-1)", "10 (+0)", "13 (+1)", "16 (+3)", "1 (-5)"]);
    expect(modifier("20")).toBe("+5");
  });

  it("round-trips standard creature fields without removing extra user content", () => {
    const initial = makeTemplate("creature");
    initial.content?.push(heading("Custom reactions", 3), paragraph("Parry the first strike."));
    const changed = patchTemplate(initial, {
      ...templateFields(initial), name: "Blackwater Warden", str: "20",
      actions: "Multiattack. Two strikes.",
    });
    expect(templateFields(changed).name).toBe("Blackwater Warden");
    expect(templateFields(changed).str).toBe("20");
    expect(templateFields(changed).actions).toBe("Multiattack. Two strikes.");
    expect(JSON.stringify(changed)).toContain("Custom reactions");
    expect(JSON.stringify(changed)).toContain("Parry the first strike.");
  });

  it("migrates an old single-line creature ability row into six usable fields", () => {
    const old = {
      type: "statBlock", attrs: { kind: "creature" }, content: [
        heading("Warden", 2),
        paragraph("Medium undead, neutral"),
        paragraph("Armor Class 14 • Hit Points 33 • Speed 20 ft."),
        paragraph("STR 12 DEX 14 CON 16 INT 10 WIS 8 CHA 9"),
        heading("Actions", 3),
        paragraph("Claw. Melee attack."),
      ],
    };
    const fields = templateFields(old);
    expect(fields.hitPoints).toBe("Hit Points 33");
    expect(fields.dex).toBe("14");
    expect(fields.actions).toBe("Claw. Melee attack.");
    const updated = patchTemplate(old, { ...fields, dex: "18" });
    expect(JSON.stringify(updated)).not.toContain("STR 12 DEX 14");
    expect(templateFields(updated).dex).toBe("18");
    expect(updated.content?.filter((part) => part.type === "table")).toHaveLength(1);
  });

  it("supports distinct magic item and callout layouts", () => {
    const item = makeTemplate("magicItem");
    expect(item.attrs?.kind).toBe("magicItem");
    expect(templateFields(item).attunement).toBe("Requires attunement");
    const box = makeTemplate("readaloud");
    expect(box.type).toBe("callout");
    expect(templateFields(box).name).toBe("Read aloud");
  });
});
