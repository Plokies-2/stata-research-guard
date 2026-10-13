"use strict";

const crypto = require("node:crypto");

// A reading-volume trigger, never a text-cutting or semantic-quality threshold.
const HELP_CHARACTER_THRESHOLD = 24000;

function deliverHelp(entry, navigation, requested, view, knownFoundation) {
  const content = entry.content;
  if (typeof content !== "string") return entry;
  const characterCount = Array.from(content).length;
  if (view === "full" || (!requested && view !== "catalog" && characterCount <= HELP_CHARACTER_THRESHOLD)) {
    return { ...entry, delivery: "full_help", content_characters: characterCount };
  }
  const sourceHash = crypto.createHash("sha256").update(content).digest("hex");
  const lines = content.match(/[^\n]*\n|[^\n]+$/g) || [];
  const currentMap = navigation?.content_sha256 === sourceHash;
  const sections = currentMap ? navigation.sections : [{
    id: "whole-source", title: "Complete source — no reviewed internal boundaries", start: 1, end: lines.length,
  }];
  const required = currentMap ? (navigation.required_sections || []) : [];
  const catalog = sections.map((section) => ({ ...section,
    characters: Array.from(lines.slice(section.start - 1, section.end).join("")).length,
    required: required.includes(section.id),
  }));
  const metadata = {
    content_characters: characterCount, source_content_sha256: sourceHash,
    selection_threshold_characters: HELP_CHARACTER_THRESHOLD,
    required_sections: required,
    ...(!currentMap ? { navigation_note: "No current reviewed section map. The source remains intact as one selectable unit; no length-based cuts or silent full-body fallback." } : {}),
  };
  if (!requested || (navigation && !currentMap && !requested.every((id) => id === "whole-source"))) {
    return { ...entry, ...metadata, content: null, delivery: "catalog_only", section_catalog: catalog,
      scope_note: "No help body was delivered. Use headings and any read_when cues to select the material sections, including relevant defaults, sample, returned state, and cross-references. Common foundation sections accompany selections; the server does not choose task-dependent requirements. Use help_view full when needed.",
    };
  }
  const invalidIds = requested.filter((id) => !sections.some((section) => section.id === id));
  if (invalidIds.length) {
    throw new Error(`invalid exact help section selection: ${entry.command || "source"}`
      + `\nInvalid IDs: ${JSON.stringify(invalidIds)}`
      + `\nValid IDs: ${JSON.stringify(sections.map((section) => section.id))}`
      + `\nTitles in the same order: ${JSON.stringify(sections.map((section) => section.title))}`
      + "\nNo help body was delivered. Retry with the exact IDs above in help_sections (Phase 2) or expanded_sections (Phase 3); another catalog call is unnecessary. No replacement was selected.");
  }
  const foundationHash = required.length ? crypto.createHash("sha256").update(JSON.stringify({
    source_sha256: sourceHash,
    sections: catalog.filter((section) => required.includes(section.id)),
  })).digest("hex") : null;
  const reuseFoundation = foundationHash !== null && knownFoundation === foundationHash;
  const selectedIds = new Set([...(reuseFoundation ? [] : required), ...requested]);
  const selected = catalog.filter((section) => selectedIds.has(section.id));
  return { ...entry, ...metadata, delivery: "selected_source_sections",
    requested_sections: requested, selected_sections: selected,
    ...(foundationHash ? { foundation_sha256: foundationHash } : {}),
    ...(reuseFoundation ? { foundation_unchanged: true,
      reused_foundation_sections: required.filter((id) => !requested.includes(id)) } : {}),
    content: selected.map((section) => lines.slice(section.start - 1, section.end).join("")).join("\n"),
    scope_note: (reuseFoundation
      ? "Explicitly requested original sections; unchanged foundation text acknowledged as still visible by the caller is not repeated. Omit known_help_foundations after context loss to retrieve it again. "
      : "Original sections plus common foundation sections. ")
      + "read_when is reading guidance, not automatic selection or a completeness judgment. Follow remaining material cross-references or request full help. Large sections are not truncated to fit the threshold.",
  };
}

module.exports = { HELP_CHARACTER_THRESHOLD, deliverHelp };
