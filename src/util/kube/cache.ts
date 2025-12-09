import { atom, useAtomValue } from "jotai";
import { makeKubePath } from "./routes";
import { KubeUrlComponents } from "./routes";
import { useResourceSubscription } from "./subscriptions";
import { GenericKubernetesResource } from "./types";
import { useMemo } from "react";

export const kubernetesResourceAtom = atom<{
  [key: string]: GenericKubernetesResource[];
}>({});

export const kubernetesLoadingAtom = atom<{
  [key: string]: boolean;
}>({});

export const useKubernetesResourceCache = (key: string) => {
  const resourceAtom = useMemo(
    () =>
      atom(
        (get) => {
          const cache = get(kubernetesResourceAtom);
          return cache[key] || [];
        },
        (
          get,
          set,
          updateFn: (
            current: GenericKubernetesResource[]
          ) => GenericKubernetesResource[]
        ) => {
          const cache = get(kubernetesResourceAtom);
          set(kubernetesResourceAtom, {
            ...cache,
            [key]: updateFn(cache[key] || []),
          });
        }
      ),
    [key]
  );
  return resourceAtom;
};
export const useCachedResource = (kubePathComponents: KubeUrlComponents) => {
  const cachedResources = useAtomValue(kubernetesResourceAtom);
  const resourceType = {
    ...kubePathComponents,
    name: "",
    namespace: "",
  };
  const resourcesOfType = cachedResources[makeKubePath(resourceType)];
  const resource = resourcesOfType?.find(
    (e) =>
      e.metadata.name === kubePathComponents.name &&
      (kubePathComponents.namespace
        ? e.metadata.namespace === kubePathComponents.namespace
        : true)
  );
  return resource;
};

export const useCachedResourceList = (kubePathComponents: KubeUrlComponents) => {
  const cachedResources = useAtomValue(kubernetesResourceAtom);
  const resourceType = {
    ...kubePathComponents,
    name: "",
    namespace: "",
  };
  const resourcesOfType = cachedResources[makeKubePath(resourceType)];
  return resourcesOfType;
}

export const useCachedResourceAndStartWatch = (
  kubePathComponents: KubeUrlComponents
) => {
  const resource = useCachedResource(kubePathComponents);
  useResourceSubscription(kubePathComponents);
  return resource;
};
