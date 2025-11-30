import { createContext } from "react";
import { GenericKubernetesResource } from "../../util/kube/types";

export const ResourceInfoPageContext = createContext({
  resource: {} as GenericKubernetesResource,
});