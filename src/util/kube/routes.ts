import { useMemo } from "react";
import { useParams } from "react-router";

export type KubeGroup = "api" | "apis";
export interface KubeUrlComponents {
  // resource namespace
  namespace?: string;
  // resource name
  name?: string;

  // empty string for core group,
  // otherwise the api group name
  group: string;

  // api version,
  // for custom resources this will be something like "admissionregistration.k8s.io/v1"
  // for core resources this will be something like "v1"
  api_version: string;

  // plural form of resource, i.e. "pods" or "mutatingwebhookconfigurations"
  resource_plural: string;
} /**
 * returns a kube api path for the given components
 *
 * examples:
 *
 * /api/v1/services - { group: "", api_version: "v1", resource_plural: "services" }
 *
 * /apis/admissionregistration.k8s.io/v1/mutatingwebhookconfigurations - { group: "admissionregistration.k8s.io", api_version: "admissionregistration.k8s.io/v1", resource_plural: "mutatingwebhookconfigurations" }
 */

export const makeKubePath = (components: KubeUrlComponents) => {
  return `/${components.group ? "apis" : "api"}/${components.api_version}/${components.namespace ? `namespaces/${components.namespace}/` : ""}${components.resource_plural}${components.name ? `/${components.name}` : ""}`;
};
export type KubeCoreGroupPathParams = {
  api_version: string;
  resource_plural: string;
  name?: string;
  namespace?: string;
};
export type KubeApisGroupPathParams = {
  api_group_domain: string;
  api_group_version: string;
  resource_plural: string;
  name?: string;
  namespace?: string;
};
export type KubePathParams = KubeCoreGroupPathParams | KubeApisGroupPathParams;
export const useKubePathParams = (): KubeUrlComponents => {
  const params = useParams() as KubePathParams;
  const assertion = useMemo(() => {
    if (params.hasOwnProperty("api_group_domain")) {
      const assertion = params as Partial<KubeApisGroupPathParams>;
      return {
        group: assertion.api_group_domain!,
        api_version:
          assertion.api_group_domain + "/" + assertion.api_group_version!,
        resource_plural: assertion.resource_plural!,
        namespace: assertion.namespace,
        name: assertion.name,
      };
    }

    const assertion = params as Partial<KubeCoreGroupPathParams>;
    return {
      group: "",
      api_version: assertion.api_version!,
      resource_plural: assertion.resource_plural! ?? "namespaces",
      namespace: assertion.namespace,
      name: assertion.name,
    };
  }, [
    params.name,
    params.namespace,
    params.api_version,
    params.resource_plural,
    params.api_group_version,
    params.api_group_domain,
  ]);
  return assertion;
};
