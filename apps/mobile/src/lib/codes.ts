import { apiFetch } from "./apiClient";

export interface CodeItem {
  code: string;
  name: string;
  parentCode: string | null;
  parentName: string | null;
  depth: number;
  path: string;
}

export function getRegionCodes(): Promise<{ items: CodeItem[] }> {
  return apiFetch<{ items: CodeItem[] }>("/codes/regions");
}
