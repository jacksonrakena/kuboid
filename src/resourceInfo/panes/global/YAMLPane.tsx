import { Editor } from "@monaco-editor/react";
import { useKubePathParams } from "../../../util/kube";
import { useCachedResource } from "../../utils";
import { convert } from "@catalystic/json-to-yaml";
import { useMemo, useState } from "react";
import { Box, Flex, Kbd, Switch, Text } from "@radix-ui/themes";
import { useKeyPress } from "../../../App";

export const YAMLPane = () => {
  const kubePathComponents = useKubePathParams();
  const resource = useCachedResource(kubePathComponents);
  const [hideManagedFields, setHideManagedFields] = useState(true);
  const [decrypt, setDecrypt] = useState(false);
  const isDecryptable = kubePathComponents.resource_plural === "secrets";
  useKeyPress("x", () => {
    setDecrypt((prev) => !prev);
  });
  useKeyPress("m", () => {
    setHideManagedFields((prev) => !prev);
  });
  const text = useMemo(() => {
    let temporary = { ...resource };
    if (isDecryptable && decrypt) {
      temporary = {
        ...resource,
        data: Object.fromEntries(
          Object.entries(resource.data ?? {}).map(([key, value]) => [
            key,
            atob(value as string),
          ])
        ),
      };
    }
    if (hideManagedFields) {
      temporary = {
        ...temporary,
        metadata: { ...temporary.metadata, managedFields: undefined },
      };
    }
    console.log(temporary);
    return convert(temporary);
  }, [resource, decrypt, isDecryptable, hideManagedFields]);
  return (
    <>
      <Flex
        gap="8"
        style={{ paddingLeft: "64px", paddingTop: "8px", paddingBottom: "8px" }}
      >
        <Box>
          <Text as="label" size="2">
            <Flex gap="2" align={"center"}>
              <Switch
                size="1"
                checked={hideManagedFields}
                onCheckedChange={setHideManagedFields}
              />{" "}
              Hide managed fields <Kbd>M</Kbd>
            </Flex>
          </Text>
        </Box>
        {isDecryptable && (
          <Box>
            <Text as="label" size="2">
              <Flex gap="2" align={"center"}>
                <Switch
                  size="1"
                  checked={decrypt}
                  onCheckedChange={setDecrypt}
                />{" "}
                Decode <Kbd>X</Kbd>
              </Flex>
            </Text>
          </Box>
        )}
      </Flex>
      <Editor
        language="yaml"
        value={text}
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
    </>
  );
};
