import { useEffect, useMemo } from "react";
import { makeKubePath, type KubeUrlComponents } from "./routes";
import { useCachedResourceList } from "./cache";
import { GenericKubernetesResource } from "./types";
import { useSubscriptionContext } from "./SubscriptionContext";



/**
 * Ensures a backend subscription is active for the given resource.
 * Does not return data. Use useCachedResourceList to get data.
 */
export const useResourceSubscription = (
  resource: KubeUrlComponents
) => {
  const { subscribe } = useSubscriptionContext();
  const key = makeKubePath(resource);

  // Stabilize the resource object so we don't resubscribe on every render
  // if the path components haven't changed.
  const stableResource = useMemo(() => resource, [key]);

  useEffect(() => {
    const unsubscribe = subscribe(stableResource);
    return () => {
      unsubscribe();
    };
  }, [stableResource, subscribe]);
};

export type ResourceListState<T extends GenericKubernetesResource> = {
  resources: T[];
  lastEventTime: Date | null;
  isLoading: boolean;
};

export const useResourceList = <T extends GenericKubernetesResource>(
  resourceType: KubeUrlComponents
) => {
  // Ensure subscription is active
  useResourceSubscription(resourceType);

  // Read from global cache
  const { resources: cachedResources, isLoading } = useCachedResourceList(resourceType);

  // Return stable empty array if undefined
  const resources = useMemo(() => (cachedResources as T[]) || [], [cachedResources]);

  // Update lastTime when resources change, using useMemo to avoid extra render cycle
  const lastEventTime = useMemo(() => new Date(), [resources]);

  return { resources, lastEventTime, isLoading };
};
