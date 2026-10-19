# Bundled SRD references

These versioned catalogs are served with Adventure Drafter. Opening the picker loads only the selected edition and category. Inserted blocks are independent editable copies, including source attribution. Runtime editing does not depend on an external reference API.

| Edition | Catalog | Entries | Source |
| --- | --- | ---: | --- |
| 2014 | Monsters | 334 | 5e-bits/5e-database, SRD 5.1 |
| 2014 | Magic items | 240 | mmmbeer/shoppe, SRD 5.1 |
| 2024 | Monsters and animals | 330 | downfallx/dnd-5e-srd-markdown, SRD 5.2.1 |
| 2024 | Magic items | 243 | mmmbeer/shoppe, SRD 5.2 |

The 2024 monster catalog uses the complete Markdown transcription used by Dungeon Delve's reference layer. This retains initiative, all saving throw modifiers, spell lists, usage limits, reactions, bonus actions, and legendary-action budgets. The alternative structured 2024 monster dataset omits initiative and is not shipped here.

Magic-item catalogs reuse Shoppe's edition-specific source trees. The conversion retains full descriptions and nested tables, includes Orb of Dragonkind from the 2014 Artifacts section, and attaches the separate Apparatus of the Crab lever table to its item. General sentient-item rules are not offered as a magic item. The 2024 item source is SRD 5.2 (as identified in Shoppe), rather than relabeled 2014 text.

## Rebuild

Run `node scripts/build-srd-catalog.mjs /path/to/srd-source` from the repository root. The source directory must contain these exact UTF-8 inputs:

- `items-2014.json`: `mmmbeer/shoppe`, commit `9c583aaa96da67de5154968c03446b58f16421b6`, `docs/srd/srd_magic_items.json`.
- `items-2024.json`: the same Shoppe commit, `docs/srd/srd52_magic_items.json`.
- `monsters-2014.json`: `5e-bits/5e-database`, commit `a6212beb4b278917c2cff41c2b04c4ef4f3e0d6f`, `src/2014/en/5e-SRD-Monsters.json`.
- `monsters-2024.md`: `downfallx/dnd-5e-srd-markdown`, commit `1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4`, `monsters-A-Z.md`.
- `animals-2024.md`: the same Markdown repository commit, `animals.md`.

Sources:

- https://github.com/mmmbeer/shoppe
- https://github.com/5e-bits/5e-database
- https://github.com/downfallx/dnd-5e-srd-markdown
- https://www.dndbeyond.com/srd
- https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf

The 2014 structured monster source omits the shared legendary-action budget paragraph. The converter restores a concise adaptation of its three-action budget, turn timing, and reset rule, verified against the legendary creatures in the official SRD 5.1 PDF above. Individual action costs remain in their action headings.

Changes are limited to structured extraction, layout formatting, edition-qualified IDs, and organizing ability scores/saves into editable fields. Full entry text remains editable after insertion. Very long blocks can continue across pages with labeled continuation headings.

## Attribution

This work includes material from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

See `5e-bits-LICENSE.txt` and `markdown-LICENSE.txt` for upstream notices. No endorsement by Wizards of the Coast or the source projects is implied.
