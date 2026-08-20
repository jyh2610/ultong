import { useQuery } from "@tanstack/react-query";

import { fetchFacilityById } from "../../../lib/facilities";

export function useFacility(id: string) {
  return useQuery({ queryKey: ["facility", id], queryFn: () => fetchFacilityById(id) });
}
