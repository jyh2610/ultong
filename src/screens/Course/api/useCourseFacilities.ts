import { useQuery } from "@tanstack/react-query";

import { fetchFacilities } from "../../../lib/facilities";

export function useCourseFacilities() {
  return useQuery({ queryKey: ["facilities"], queryFn: fetchFacilities });
}
