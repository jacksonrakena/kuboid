import { Channel, invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { ResourceType } from "./types";

export interface ResourceWithId {
  metadata: {
    uid: string;
  };
}

export type ResourceSubscriptionEvent<T> =
  | {
      event: "update" | "delete" | "initupdate";
      data: T;
    }
  | { event: "close" };
type InternalSubscriptionEvent<T> = {
  event: "apply" | "delete" | "initApply";
  data: { resource: T };
};

export const useResourceSubscription = <T,>(
  resource: ResourceType,
  callback: (event: ResourceSubscriptionEvent<T>) => void
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
      if (msg.event === "apply") {
        callback({
          event: "update",
          data: msg.data.resource,
        });
      } else if (msg.event === "delete") {
        callback({
          event: "delete",
          data: msg.data.resource,
        });
      } else if (msg.event === "initApply") {
        callback({
          event: "initupdate",
          data: msg.data.resource,
        });
      }
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
    if (event.event === "close") {
      setResources([]);
      return;
    } else if (event.event === "delete") {
      setResources((prev) =>
        prev.filter((e) => e.metadata.uid !== event.data.metadata.uid)
      );
    } else if (event.event === "initupdate") {
      setResources((prev) => [...prev, event.data]);
    } else {
      setResources((prev) => [
        ...prev.filter((e) => e.metadata.uid !== event.data.metadata.uid),
        event.data,
      ]);
    }
  });
  return { resources, lastEventTime: lastTime };
};
