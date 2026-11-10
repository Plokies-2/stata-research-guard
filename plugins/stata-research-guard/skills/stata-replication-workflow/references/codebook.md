# Minimal Excel Codebook

Read this reference before creating or updating a project codebook, regardless of the language used to change the data. Follow the user's existing workbook and explicit choices. Use the compact variable-list structure of `FnGuide_variable_list_Nayeon.xlsx`; its incidental highlights are not a theme to copy.

## Establish whether a codebook is wanted

- On the first research run in a project, check the current conversation, relevant project instructions and existing documentation for a codebook, a designated workbook, or a prior decision to create, maintain or skip one. Use the relevant known locations; do not scan the whole project to invent an inventory.
- If there is no codebook context, **you must ask whether to create one before the first run**: "이 프로젝트의 Excel 코드북도 만들까요?" Wait for the answer before creating a workbook or adding codebook-generation code. Neither variable changes nor a general request to run the analysis implies consent. If the answer is pending, independent source reading and code preparation may continue.
- Honor an existing decision across follow-ups and sessions when it is available in context or project documentation. An existing codebook is context for maintaining it; do not ask again for each variable change. If the user declines, continue the research without a codebook and do not report its absence as a defect. Do not add a tracking file, approval flag or new configuration system for this decision.
- Once creation or maintenance is established, update the same workbook alongside substantive variable changes. Unchanged mentions, verbatim moves, formatting edits and unchanged-file reruns do not require codebook changes.

## Write only what identifies and defines the variable

Use these five columns in this order unless the user requires another existing layout:

| Column | Content |
| --- | --- |
| `varname` | Actual variable name. |
| `Item` | Source item code, when one exists. Leave blank for derived variables or unavailable codes. |
| `Item Name` | Short variable name or definition in readable Korean, following the project's language. |
| `format / unit` | Unit, identifier pattern or category coding needed to read the values. Leave blank when unnecessary. |
| `note` | Only an essential formula, non-obvious source/merge distinction, or definition-changing treatment. Otherwise leave blank. |

- One variable per row. A short topic heading and blank separator row may group related variables as in the reference. Start with the column header; do not add a cover, dashboard, introduction or sheet explaining how to read the codebook.
- Keep source-variable rows as short as their name, item code, definition and unit allow. **Blank cells are valid. Do not fill every field or require a note for every variable.**
- For a derived variable, give the shortest formula needed to reproduce its definition. Add a condition only when it changes the defined values, such as the denominator restriction, log domain, price base year or special missing-value treatment. Keep these facts; remove surrounding explanations and generic cautions. Do not repeat the definition and unit in the note.
- Keep the scope to the relevant dataset's substantive variables. Do not list scratch variables, loop state or every intermediate representation. Reuse existing definitions; clarify a dataset/stage distinction only when the same name would otherwise be ambiguous.
- Do not automatically add storage types, observation or missing counts, ranges, quantiles, example values, model roles, script line numbers, absolute paths, hashes, run status, review status, change histories or long usage/interpretation paragraphs. An explicit request may require a particular field; it does not authorize adding the others.
- Use actual code and source documentation. Leave unavailable source codes blank. Ask about a consequential unresolved definition rather than inventing one; a necessary unresolved point belongs once beside the affected definition, not in repeated disclaimers.
- Update changed definitions and essential rename/removal notes in place. Preserve unrelated entries. Do not append a second dictionary, full variable inventory or revision log.

Examples of the intended level of detail (illustrative definitions, not research specifications):

| varname | Item | Item Name | format / unit | note |
| --- | --- | --- | --- | --- |
| stock_code | | 종목코드 | A000000 | |
| NI | M000908001 | 당기순이익 | 천원 | |
| ln_sales | | 매출액 로그 | 자연로그 | ln(sales). sales가 양수일 때 계산. |

## Plain worksheet formatting

- **White/no-fill cells and black text are the default.** Use Malgun Gothic for Korean. Keep normal body text and readable widths; bold column headers and short group headings suffice.
- **Do not apply Word/Office-style blue header fills, white-on-blue text, accent-color themes, Excel table styles, alternating row bands, decorative title bars or colored tab palettes.** Generic spreadsheet/document styling defaults do not override this rule. Do not add highlights merely to make the workbook look polished.
- Use column widths, wrapping and row height only as needed to read the content. Keep borders minimal. Do not merge cells or add ornamental blocks for presentation.
- Preserve an existing workbook's unrelated formatting during a narrow update. New codebook cells use the plain style; do not extend incidental highlights into a new color scheme. Apply a user-requested format change only to its authorized scope.

## Focused readback

Read the affected rows against the actual variable definitions and available execution evidence. Check that names, essential formulas and units are correct and legible. Keep execution/review commentary in the task response, not workbook metadata or extra sheets. This is a short researcher reference, not an automatic inventory or validation system.
