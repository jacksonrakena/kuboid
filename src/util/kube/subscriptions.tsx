import { Channel, invoke } from "@tauri-apps/api/core";
import { startTransition, useEffect, useState } from "react";
import { makeKubePath } from "./routes";
import { type KubeUrlComponents } from "./routes";
import { useKubernetesResourceCache } from "./cache";
import { useSetAtom } from "jotai";
import { GenericKubernetesResource } from "./types";

type InternalSubscriptionEvent<T> =
  | {
      event: "apply" | "delete" | "initApply";
      data: { resource: T };
    }
  | { event: "init" | "initDone" };

export const useResourceSubscription = <T,>(
  resource: KubeUrlComponents,
  callback: (event: InternalSubscriptionEvent<T>) => void
) => {
  useEffect(() => {
    const subscriptionId = Math.floor(Math.random() * 99999999);
    const subscription = {
      ...resource,
      subscriptionId: subscriptionId,
    };
    const channel = new Channel<InternalSubscriptionEvent<T>>();
    channel.onmessage = (msg) => {
      // console.log(msg);
      callback(msg);
    };

    console.log("Listening for updates", subscription);
    invoke("start_listening", {
      ...subscription,
      apiVersion: resource.api_version,
      resourcePlural: resource.resource_plural,
      channel,
      namespace: resource.namespace,
      name: resource.name,
    });
    return () => {
      console.log("Closing updates on ", subscription);
      invoke("stop_listen_task", { taskId: subscriptionId });
      channel.onmessage = () => {};
    };
  }, [resource]);
};

export type ResourceListState<T extends GenericKubernetesResource> = {
  resources: T[];
  lastEventTime: Date | null;
};
export const useResourceList = <T extends GenericKubernetesResource>(
  resourceType: KubeUrlComponents
) => {
  const kubeCacheAtom = useKubernetesResourceCache(makeKubePath(resourceType));
  const setResourcesInCache = useSetAtom(kubeCacheAtom);
  const [resources, setResources] = useState<T[]>([]);
  const [lastTime, setLastTime] = useState<Date | null>(null);
  useEffect(() => {
    setResources([]);
    setLastTime(new Date());
  }, [resourceType]);
  useResourceSubscription<T>(resourceType, (event) => {
    setLastTime(new Date());
    switch (event.event) {
      case "init":
        setResourcesInCache(() => []);
        break;
      case "initDone":
        break;
      case "initApply":
        startTransition(() => {
          setResources((prev) => [...prev, event.data.resource]);
          setResourcesInCache((prev) => [...prev, event.data.resource]);
        });
        break;
      case "apply":
        startTransition(() => {
          setResources((prev) => [
            ...prev.filter(
              (e) => e.metadata.uid !== event.data.resource.metadata.uid
            ),
            event.data.resource,
          ]);
          setResourcesInCache((prev) => [
            ...prev.filter(
              (e) => e.metadata.uid !== event.data.resource.metadata.uid
            ),
            event.data.resource,
          ]);
        });
        break;
      case "delete":
        startTransition(() => {
          setResources((prev) =>
            prev.filter(
              (e) => e.metadata.uid !== event.data.resource.metadata.uid
            )
          );
          setResourcesInCache((prev) =>
            prev.filter(
              (e) => e.metadata.uid !== event.data.resource.metadata.uid
            )
          );
        });
        break;
    }
  });
  return { resources, lastEventTime: lastTime };
};
