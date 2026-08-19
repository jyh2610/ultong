import { useQuery } from "@tanstack/react-query";

import { fetchFacilities } from "../../../lib/facilities";

export function useHomeFacilities() {
  return useQuery({ queryKey: ["facilities"], queryFn: fetchFacilities });
}
