export { DEFAULT_MODEL, proposerTests } from "./generation/index.ts";
export type { Options, Proposal } from "./generation/index.ts";
export { ceQuiChange, proposerTestDepuisFiche } from "./generation/fiche.ts";
export type { FicheDeChangement, RegleEtat } from "./generation/fiche.ts";
export type { ModelCall } from "./generation/router.ts";
export { proposerCorrection } from "./correction/index.ts";
export type { CorrectionOptions, CorrectionProposal } from "./correction/index.ts";
export { comparerImages, consoliderConstats, formuler, releverValeurs, verifierReleve, versDecision } from "./verification/index.ts";
export type { Constat, EntreeVerification, ImageComparison, ImageZone, ReleveCapture, ScreenValues, Table } from "./verification/index.ts";
