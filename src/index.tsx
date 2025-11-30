import {
  Avatar,
  Box,
  Button,
  Card,
  Flex,
  IconButton,
  RadioCards,
  Text,
} from "@radix-ui/themes";
import { TauriImage } from "./util/tauri/TauriImage";
import { ArrowRightIcon, GearIcon } from "@radix-ui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { safeInvoke } from "./util/kube/requests";
import { KubeConfig } from "@kubernetes/client-node";
import { useNavigate } from "react-router";
import { useAtom, useSetAtom } from "jotai";
import { currentConfigAtom } from "./util/kube/context";

export const DICEBEAR_STYLE = "glass";
export const Home = () => {
  const navigate = useNavigate();
  const [contexts, setContexts] = useState<KubeConfig[]>([]);
  useEffect(() => {
    (async () => {
      const result = await safeInvoke<KubeConfig[]>("list_kube_contexts");
      console.log(result);
      if (result.success) {
        setContexts(result.data);
      }
    })();
  }, []);

  const setCurrentConfig = useSetAtom(currentConfigAtom);
  const kubeUsers = useMemo(() => contexts.flatMap((e) => e.users), [contexts]);
  const kubeContexts = useMemo(
    () => contexts.flatMap((e) => e.contexts),
    [contexts]
  );
  const kubeClusters = useMemo(
    () => contexts.flatMap((e) => e.clusters),
    [contexts]
  );

  const [loading, setLoading] = useState(false);

  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  return (
    <Flex
      direction={"column"}
      className="container"
      style={{ height: "100vh" }}
    >
      <Flex
        justify={"between"}
        style={{
          width: "100%",
          height: "50px",
          padding: "18px",
        }}
        data-tauri-drag-region
      >
        <Box></Box>
        <Box>
          <IconButton variant="ghost" color="gray" onClick={() => {}}>
            <GearIcon />
          </IconButton>
        </Box>
      </Flex>
      <Flex
        flexGrow={"1"}
        align={"center"}
        justify={"center"}
        direction={"column"}
        gap="8"
      >
        <Flex direction={"row"} gap={"300px"}>
          <Flex direction={"column"} gap="6">
            <Flex gap="3" align="center">
              <TauriImage
                path="../assets/128x128@2x.png"
                style={{ maxHeight: "75px" }}
              />
              <Box>
                <Text as="div" size="7" weight="bold">
                  Kuboid
                </Text>
                <Text as="div" size="2" color="gray">
                  Select a cluster to manage
                </Text>
              </Box>
            </Flex>

            <Flex direction={"column"} gap="6">
              <RadioCards.Root
                value={selectedContext}
                onValueChange={(e) => setSelectedContext(e)}
                columns={{ initial: "1", sm: "3" }}
              >
                {kubeContexts.map((ctx) => {
                  return (
                    <RadioCards.Item key={ctx.name} value={ctx.name}>
                      <Flex align="center" gap="3">
                        <Avatar
                          src={`https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/svg?seed=${ctx.name}`}
                          alt={ctx.name}
                          size="3"
                          fallback={""}
                        />
                        <Box>
                          <Text as="div" size="2" weight="bold">
                            {ctx.name}
                          </Text>
                          <Text as="div" size="2" color="gray">
                            {ctx.context.user}
                          </Text>
                        </Box>
                      </Flex>
                    </RadioCards.Item>
                  );
                })}
              </RadioCards.Root>
            </Flex>
          </Flex>
          {/* <Box></Box> */}
        </Flex>
        <Flex>
          <Button
            disabled={!selectedContext}
            loading={loading}
            onClick={() => {
              setLoading(true);
              (async () => {
                const result = await safeInvoke("start", {
                  kubeconfig: contexts[0],
                });
                console.log(result);
                if (result.success) {
                  setCurrentConfig(contexts[0]);
                  setLoading(false);
                  navigate("/app");
                }
              })();
            }}
          >
            Connect <ArrowRightIcon />
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};
