import { useAtomValue } from "jotai";
import { KubeUrlComponents, makeKubePath } from "../util/kube";
import { kubernetesResourceAtom } from "../util/clientstate";

export const useCachedResource = (kubePathComponents: KubeUrlComponents) => {
  const cachedResources = useAtomValue(kubernetesResourceAtom);
  const resourceType = {
    ...kubePathComponents,
    name: "",
    namespace: "",
  };
  const resourcesOfType = cachedResources[makeKubePath(resourceType)];
  const resource = resourcesOfType.find(
    (e) =>
      e.metadata.name === kubePathComponents.name &&
      (kubePathComponents.namespace
        ? e.metadata.namespace === kubePathComponents.namespace
        : true)
  );
  return resource;
};
