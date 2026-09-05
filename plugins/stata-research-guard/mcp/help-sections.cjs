"use strict";

const crypto = require("node:crypto");

// A reading-volume trigger, never a text-cutting or semantic-quality threshold.
const HELP_CHARACTER_THRESHOLD = 24000;

function deliverHelp(entry, navigation, requested, view) {
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
    id: "whole-source", title: "Complete source — no verified internal boundaries", start: 1, end: lines.length,
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
      scope_note: "No help body was delivered. Select source sections after considering the task, syntax, options, returned results, warnings, and cross-references. Required foundation sections accompany every selection. Use help_view full when the whole source is needed.",
    };
  }
  if (requested.some((id) => !sections.some((section) => section.id === id))) {
    throw new Error(`invalid exact help section selection: ${entry.command || "source"}`);
  }
  const selectedIds = new Set([...required, ...requested]);
  const selected = catalog.filter((section) => selectedIds.has(section.id));
  return { ...entry, ...metadata, delivery: "selected_source_sections",
    requested_sections: requested, selected_sections: selected,
    content: selected.map((section) => lines.slice(section.start - 1, section.end).join("")).join("\n"),
    scope_note: "Original complete sections plus required foundation sections. This is not a completeness judgment: follow remaining material cross-references or request full help. Large sections are not truncated to fit the threshold.",
  };
}

module.exports = { HELP_CHARACTER_THRESHOLD, deliverHelp };
