import { useQuery } from "@tanstack/react-query";
import type { SelectCharacter } from "@shared/schema";

const CHARACTERS_QUERY_KEY = ["/api/characters"];
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data won't refetch within this time
const GC_TIME = 10 * 60 * 1000; // 10 minutes - cache kept in memory

export function useCharacters() {
  return useQuery<SelectCharacter[]>({
    queryKey: CHARACTERS_QUERY_KEY,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Export the query key for cache invalidation
export { CHARACTERS_QUERY_KEY };
