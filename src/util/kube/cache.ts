import { atom, useAtomValue, useSetAtom } from "jotai";
import { makeKubePath } from "./routes";
import { KubeUrlComponents } from "./routes";
import { useResourceSubscription } from "./subscriptions";
import { GenericKubernetesResource } from "./types";

export const kubernetesResourceAtom = atom<{
  [key: string]: GenericKubernetesResource[];
}>({});

export const useKubernetesResourceCache = (key: string) => {
  const resourceAtom = atom(
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

export const useCachedResourceAndStartWatch = (
  kubePathComponents: KubeUrlComponents
) => {
  const resource = useCachedResource(kubePathComponents);
  const kubeCacheAtom = useKubernetesResourceCache(
    makeKubePath({ ...kubePathComponents, name: "", namespace: "" })
  );
  const setResourcesInCache = useSetAtom(kubeCacheAtom);
  useResourceSubscription<GenericKubernetesResource>(
    kubePathComponents,
    (event) => {
      if (event.event === "apply") {
        setResourcesInCache((prev) => [
          ...prev.filter(
            (e) => e.metadata.uid !== event.data.resource.metadata.uid
          ),
          event.data.resource,
        ]);
      }
    }
  );
  return resource;
};
