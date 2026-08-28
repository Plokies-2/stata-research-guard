# Workflow Stage Checklist

Read this when planning a new workflow or checking whether a requested stage is missing. It is not a required folder tree.

- ingestion: declared raw inputs and import semantics;
- preparation: identifiers, types, labels, missingness, and construction;
- combination: merge or append keys, retained states, and provenance;
- panel state: unit, time, duplicates, gaps, and declaration;
- sample flow: consequential filters and named observation counts;
- descriptives: requested summary populations and artifacts;
- estimation: outcomes, treatments, controls, fixed effects, weights, VCE, and sample;
- robustness or heterogeneity: only the variants the user requests;
- postestimation and figures: returned-state consumers and event axes;
- tables and exports: workbook, sheet, column order, estimate handoff, and file format.

Include only the stages needed for the request. A downstream file should reopen a durable cleaned dataset when independent reruns matter, but a small coherent workflow need not be split merely to match this checklist.
