import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { AnalysisRecord } from "./generated/api.schemas";

export const getHallOfShameUrl = () => `/api/sigil/hall-of-shame`;

export const getHallOfShame = async (
  options?: RequestInit,
): Promise<AnalysisRecord[]> => {
  return customFetch<AnalysisRecord[]>(getHallOfShameUrl(), {
    ...options,
    method: "GET",
  });
};

export const getGetHallOfShameQueryKey = () => ["hallOfShame"] as const;

export const useGetHallOfShame = <
  TData = AnalysisRecord[],
  TError = unknown,
>(options?: {
  query?: UseQueryOptions<AnalysisRecord[], TError, TData>;
}) => {
  const { query: queryOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetHallOfShameQueryKey();

  const queryFn = () => getHallOfShame();

  return useQuery<AnalysisRecord[], TError, TData>({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes — static data, rarely changes
    ...queryOptions,
  });
};
