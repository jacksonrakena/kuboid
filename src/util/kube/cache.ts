import { atom, useAtomValue } from "jotai";
import { makeKubePath } from "./routes";
import { KubeUrlComponents } from "./routes";
import { useResourceSubscription } from "./subscriptions";
import { GenericKubernetesResource } from "./types";

export interface ResourceCacheEntry {
  resources: GenericKubernetesResource[];
  isLoading: boolean;
}

export const kubernetesResourceAtom = atom<{
  [key: string]: ResourceCacheEntry;
}>({});

// removed kubernetesLoadingAtom

// removed useKubernetesResourceCache

export const useCachedResource = (kubePathComponents: KubeUrlComponents) => {
  const cachedResources = useAtomValue(kubernetesResourceAtom);
  const resourceType = {
    ...kubePathComponents,
    name: "",
    namespace: "",
  };
  const entry = cachedResources[makeKubePath(resourceType)];
  const resource = entry?.resources.find(
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
  const entry = cachedResources[makeKubePath(resourceType)];
  return entry || { resources: [], isLoading: false };
}

export const useCachedResourceAndStartWatch = (
  kubePathComponents: KubeUrlComponents
) => {
  const resource = useCachedResource(kubePathComponents);
  useResourceSubscription(kubePathComponents);
  return resource;
};
