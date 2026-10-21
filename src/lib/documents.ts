import type { JSONContent } from "@tiptap/core";
import type { Adventure, Page, PageKind } from "./types";
import { themes } from "./templates";
import { titlePageContent } from "./title-page";
export const uid = () => crypto.randomUUID();
export const text = (value: string): JSONContent => ({
  type: "text",
  text: value,
});
export const paragraph = (value = ""): JSONContent => ({
  type: "paragraph",
  content: value ? [text(value)] : [],
});
export const heading = (value: string, level = 1): JSONContent => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});
export const page = (
  kind: PageKind = "body",
  content: JSONContent[] = kind === "title"
    ? titlePageContent()
    : [paragraph()],
): Page => ({
  id: uid(),
  kind,
  breakBefore: true,
  content: { type: "doc", content },
});
export function createAdventure(blank = false): Adventure {
  return {
    format: "adventure-drafter",
    version: 1,
    id: uid(),
    title: blank ? "Untitled adventure" : "The Bell Beneath Blackwater",
    author: "Your name",
    subtitle: "A mystery for 3–5 adventurers of levels 3–5",
    updatedAt: new Date().toISOString(),
    settings: {
      theme: { ...themes[0] },
      size: "letter",
      columns: 2,
      fontSize: 15,
      lineHeight: 1.4,
      margin: 58,
      gutter: 30,
      pageStart: 1,
      footer: "",
      tocDepth: 3,
      autoIndexHeadings: true,
      indexDepth: 3,
    },
    indexTerms: ["Blackwater", "Mara Voss", "Bellkeeper"],
    fonts: [],
    pages: blank
      ? [page("title"), page()]
      : [
          page("title", [
            paragraph("AN ADVENTURE IN THE BORDERLANDS"),
            heading("The Bell Beneath Blackwater"),
            paragraph("Some things should never be called home."),
            paragraph("A mystery for 3–5 adventurers of levels 3–5"),
            paragraph("Written by Your name"),
          ]),
          page("body", [
            heading("The Bell Beneath Blackwater"),
            paragraph(
              "At dusk, a bell rings beneath the flooded chapel. No one in Blackwater admits to hearing it. By morning, another chair stands empty at the village table.",
            ),
            heading("Adventure overview", 2),
            paragraph(
              "A forgotten pact is unraveling. The party must follow the missing villagers through reed-choked waterways, uncover the Bellkeeper’s bargain, and decide what the village is willing to sacrifice.",
            ),
            {
              type: "callout",
              attrs: { kind: "readaloud" },
              content: [
                paragraph(
                  "Cold mist curls around your boots. Beyond the last cottage, the chapel leans into the marsh. Its bell tower is empty. The ringing comes from below.",
                ),
              ],
            },
            heading("Running this adventure", 2),
            paragraph(
              "Begin in the Lantern & Reed tavern. Give the characters room to question the locals before the first bell rings. Each clue should offer a new direction rather than a single correct answer.",
            ),
            heading("Three truths", 3),
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    paragraph(
                      "The missing villagers are alive, but time is running out.",
                    ),
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    paragraph("The Bellkeeper cannot leave the water."),
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    paragraph("Mara Voss knows the words that end the pact."),
                  ],
                },
              ],
            },
            heading("A village with a secret", 2),
            paragraph(
              "Blackwater rests on stilts above a black ribbon of river. Nets hang between the houses. The locals smile quickly and close their shutters early.",
            ),
            {
              type: "callout",
              attrs: { kind: "aside" },
              content: [
                heading("A note for the Game Master", 3),
                paragraph(
                  "Let the silence do some of the work. When a player asks about the bell, have the room fall quiet before anyone answers.",
                ),
              ],
            },
            heading("Adventure hooks", 2),
            paragraph(
              "A letter from a missing friend. A reward posted in the next town. A familiar voice calling from the water. Choose the invitation that gives your party a personal reason to stay.",
            ),
            heading("The first evening", 3),
            paragraph(
              "Mara Voss offers the party a dry room and a warm meal. When the bell rings, she drops her cup. Somewhere outside, a door opens by itself.",
            ),
          ]),
          page("body", [
            heading("Into the drowned chapel"),
            paragraph(
              "The old causeway disappears beneath shallow water. Three broken statues mark the approach. Their faces have been carefully chiseled away.",
            ),
            heading("1. The sunken nave", 2),
            paragraph(
              "Reeds grow between the pews. A silver chain descends through a hole in the floor. Pulling it summons the Bellkeeper.",
            ),
            {
              type: "statBlock",
              attrs: { kind: "creature" },
              content: [
                heading("The Bellkeeper", 2),
                paragraph("Medium spirit, unaligned"),
                paragraph("Armor Class 14 • Hit Points 45 (6d8 + 18)"),
                paragraph("Speed 0 ft., swim 40 ft."),
                {
                  type: "table",
                  content: [
                    {
                      type: "tableRow",
                      content: ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map(
                        (x) => ({
                          type: "tableHeader",
                          content: [paragraph(x)],
                        }),
                      ),
                    },
                    {
                      type: "tableRow",
                      content: [
                        "12 (+1)",
                        "16 (+3)",
                        "16 (+3)",
                        "11 (+0)",
                        "15 (+2)",
                        "17 (+3)",
                      ].map((x) => ({
                        type: "tableCell",
                        content: [paragraph(x)],
                      })),
                    },
                  ],
                },
                paragraph(
                  "Senses darkvision 60 ft. • Languages Common, whispers",
                ),
                heading("Actions", 3),
                paragraph(
                  "Tolling grasp. Melee spell attack: +5 to hit, reach 5 ft., one creature. Hit: 10 (2d6 + 3) cold damage. The target hears a distant bell.",
                ),
              ],
            },
            heading("Ending the pact", 2),
            paragraph(
              "The pact ends when the names of the forgotten are spoken aloud. Mara Voss carries the names in a small blue book. Returning the book to the chapel frees the missing villagers and allows the Bellkeeper to rest.",
            ),
            heading("After the adventure", 2),
            paragraph(
              "For the first time in a century, Blackwater wakes to birdsong. The chapel bell lies on the riverbank. Its bronze surface is warm.",
            ),
          ]),
        ],
  };
}
