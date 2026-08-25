import { useQuery } from "@tanstack/react-query";

import { fetchFacilities, fetchFacilityById } from "../lib/facilities";

export function useFacilities() {
  return useQuery({ queryKey: ["facilities"], queryFn: fetchFacilities });
}

export function useFacility(id: string) {
  return useQuery({ queryKey: ["facility", id], queryFn: () => fetchFacilityById(id) });
}
