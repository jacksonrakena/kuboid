import { useEffect, useMemo, useState } from "react";
import "@radix-ui/colors/gray.css";
import "@radix-ui/colors/blue.css";
import "@radix-ui/colors/green.css";
import "@radix-ui/colors/red.css";
import "@radix-ui/colors/gray-dark.css";
import "@radix-ui/colors/blue-dark.css";
import "@radix-ui/colors/green-dark.css";
import "@radix-ui/colors/red-dark.css";
import humanize from "@jsdevtools/humanize-anything";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "@radix-ui/themes/styles.css";
import * as k8s from "@kubernetes/client-node";
import {
  Badge,
  Box,
  Button,
  Code,
  DataList,
  Dialog,
  Flex,
  IconButton,
  Link,
  ScrollArea,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import { ResourceTable } from "./ResourceTable";
import { TypeSwitcher } from "./popups/TypeSwitcher";
import { ResourceList } from "./panes/ResourceList";
export const useKeyPress = (
  targetKey: string,
  callback?: () => void,
  options: {
    noEffectWhileInTextInput?: boolean;
  } = {
    noEffectWhileInTextInput: true,
  }
) => {
  const [keyPressed, setKeyPressed] = useState(false);

  useEffect(() => {
    const downHandler = (event: KeyboardEvent) => {
      const { key } = event;

      if (options.noEffectWhileInTextInput) {
        const activeElement = document.activeElement;

        // Check if the active element is an input or textarea
        if (
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA"
        ) {
          // Do nothing if in a text input
          return;
        }
      }

      if (key === targetKey) {
        setKeyPressed(true);
        if (callback) callback();
        event.preventDefault();
      }
    };

    const upHandler = ({ key }: KeyboardEvent) => {
      if (key === targetKey) {
        setKeyPressed(false);
      }
    };

    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);

    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [targetKey, callback]);

  return keyPressed;
};
const StatusBadge = ({ status }: { status: string }) => {
  let color: "red" | "green" | "yellow" | "gray" = "gray";
  if (status === "Running") color = "green";
  else if (status === "Pending") color = "yellow";
  else if (status === "Failed") color = "red";
  return <Badge color={color}>{status}</Badge>;
};

export async function http<T>(
  path: string
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const r = await invoke("exec_raw", { path: path });
  try {
    const data = JSON.parse(r as string) as T;
    return { success: true, data };
  } catch (e) {
    return { success: false, error: r as string };
  }
}
function App() {
  const kp = useKeyPress(":", () => {
    setiskpo(true);
  });
  useKeyPress(
    "Escape",
    () => {
      if (iskpo) setiskpo(false);
    },
    { noEffectWhileInTextInput: false }
  );
  const [iskpo, setiskpo] = useState(false);
  const [termv, settermv] = useState("");
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [pods, setPods] = useState<k8s.V1Pod[]>([]);
  type ApiGroup = {
    name: string;
    version: string;
    resources: { kind: string; plural: string; api_version: string }[];
  };
  useEffect(() => {
    (async () => {
      const pods = await http<k8s.V1PodList>("/api/v1/pods");
      if (pods.success) {
        setPods(pods.data.items);
      }
    })();
  }, []);
  const [selectedResource, setSelectedResource] = useState<{
    kind: string;
    group: string;
    version: string;
    api_version: string;
    plural: string;
  }>({
    // plural: "connectors",
    // kind: "Connector",
    // group: "tailscale.com",
    // version: "v1alpha1",
    plural: "pods",
    kind: "Pod",
    group: "",
    version: "v1",
    api_version: "v1",
  });
  const [apiResources, setApiResources] = useState<ApiGroup[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const api = await invoke("list_api_resources");
        setApiResources(api as ApiGroup[]);
      } catch (e) {
        console.error("Failed to fetch API resources:", e);
      }
    })();
  }, []);

  const filteredApiGroups = useMemo(() => {
    const n = [...apiResources];
    n.sort((a, b) => {
      if (a.name.length === 0) return -1;
      return a.name.localeCompare(b.name);
    });
    return n.map((e) => {
      if (!e.name) {
        return {
          ...e,
          name: "Core",
        };
      }
      return e;
    });
  }, [apiResources]);

  return (
    <main className="container" style={{ height: "100vh" }}>
      <Flex
        gap="4"
        style={{
          overflow: "clip",
          height: "100%",
          padding: "8px",
        }}
      >
        <ResourceList
          onSelectedResourceChanged={(e) => setSelectedResource(e)}
          selectedResource={selectedResource}
        />
        <ResourceTable resource={selectedResource} />
      </Flex>

      <p>{greetMsg}</p>

      <TypeSwitcher
        isOpen={iskpo}
        onClose={() => setiskpo(false)}
        resourceTypes={filteredApiGroups.flatMap((group) => {
          return group.resources.map((resource) => ({
            kind: resource.kind,
            group: group.name === "Core" ? "" : group.name,
            plural: resource.plural,
            version: group.version,
            api_version: resource.api_version,
          }));
        })}
        onAction={(action) => {
          if (action?.action === "resource_type") {
            setSelectedResource(action.target);
          }
          setiskpo(false);
        }}
      />
    </main>
  );
}

export default App;
