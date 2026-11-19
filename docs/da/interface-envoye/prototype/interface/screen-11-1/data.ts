import coverageMock from "../../contrats/exemples/couverture.json";

export type PrototypeState = "data" | "empty" | "running" | "error";
export type StatusKey = "conform" | "suspect" | "provenDefect" | "inconclusive";

export type StatusCounts = Record<StatusKey, number>;

export type CoverageScreen = {
  name: string;
  path: string;
  counts: StatusCounts;
  worstStatus: StatusKey;
};

export type ReviewItem = {
  screen: string;
  rule: string;
  status: StatusKey;
};

export const coverage = {
  ...coverageMock,
  screens: coverageMock.screens as CoverageScreen[],
  reviewItems: coverageMock.reviewItems as ReviewItem[],
};

export const statusLabels: Record<StatusKey, string> = {
  conform: "Conforme",
  suspect: "Suspect",
  provenDefect: "Défaut prouvé",
  inconclusive: "Non concluant",
};

export function getPrototypeState(): PrototypeState {
  const state = new URLSearchParams(window.location.search).get("state");
  return state === "empty" || state === "running" || state === "error" ? state : "data";
}
