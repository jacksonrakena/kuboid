import { Editor } from "@monaco-editor/react";
import { useKubePathParams } from "../../../util/kube";
import { useCachedResource } from "../../utils";
import { convert } from "@catalystic/json-to-yaml";

export const YAMLPane = () => {
  const kubePathComponents = useKubePathParams();
  const resource = useCachedResource(kubePathComponents);
  return (
    <Editor
      language="yaml"
      value={resource ? convert(resource) : "Loading..."}
      height={"100%"}
      width={"100%"}
      options={{
        minimap: {
          enabled: false,
        },
        readOnly: true,
        fontSize: 14,
      }}
    />
  );
};
