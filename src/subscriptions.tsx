import { Channel, invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { ResourceType } from "./types";

export interface ResourceWithId {
  metadata: {
    uid: string;
  };
}

type InternalSubscriptionEvent<T> = {
  event: "apply" | "delete" | "initApply";
  data: { resource: T };
};

export const useResourceSubscription = <T,>(
  resource: ResourceType,
  callback: (event: InternalSubscriptionEvent<T>) => void
) => {
  useEffect(() => {
    const subscriptionId = Math.floor(Math.random() * 99999999);
    const subscription = {
      group: resource.group,
      version: resource.version,
      kind: resource.kind,
      plural: resource.plural,
      apiVersion: resource.api_version,
      subscriptionId: subscriptionId,
    };
    const channel = new Channel<InternalSubscriptionEvent<T>>();
    channel.onmessage = (msg) => {
      console.log("Received event for ", resource.kind, msg);
      callback(msg);
    };

    console.log("Listening for updates", subscription);
    invoke("start_listening", {
      ...subscription,
      channel,
    });
    return () => {
      console.log("Closing updates on ", subscription);
      invoke("stop_listen_task", { taskId: subscriptionId });
      channel.onmessage = () => {};
    };
  }, [resource]);
};

export type ResourceListState<T extends ResourceWithId> = {
  resources: T[];
  lastEventTime: Date | null;
};
export const useResourceList = <T extends ResourceWithId>(
  resource: ResourceType
) => {
  const [resources, setResources] = useState<T[]>([]);
  const [lastTime, setLastTime] = useState<Date | null>(null);
  useEffect(() => {
    setResources([]);
  }, [resource]);
  useResourceSubscription<T>(resource, (event) => {
    setLastTime(new Date());
    switch (event.event) {
      case "initApply":
        setResources((prev) => [...prev, event.data.resource]);
        break;
      case "apply":
        setResources((prev) => [
          ...prev.filter(
            (e) => e.metadata.uid !== event.data.resource.metadata.uid
          ),
          event.data.resource,
        ]);
        break;
      case "delete":
        setResources((prev) =>
          prev.filter(
            (e) => e.metadata.uid !== event.data.resource.metadata.uid
          )
        );
        break;
    }
  });
  return { resources, lastEventTime: lastTime };
};
