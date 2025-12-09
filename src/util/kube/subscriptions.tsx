import { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { makeKubePath, type KubeUrlComponents } from "./routes";
import { useCachedResourceList, kubernetesLoadingAtom } from "./cache";
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
  const cached = useCachedResourceList(resourceType) as T[] | undefined;

  // Return stable empty array if undefined
  const resources = useMemo(() => cached || [], [cached]);

  const [lastTime, setLastTime] = useState<Date | null>(null);

  // update lastTime when resources change
  useEffect(() => {
    setLastTime(new Date());
  }, [resources]);

  const loadingMap = useAtomValue(kubernetesLoadingAtom);
  const key = makeKubePath(resourceType);
  const isLoading = loadingMap[key] ?? false;

  return { resources, lastEventTime: lastTime, isLoading };
};
