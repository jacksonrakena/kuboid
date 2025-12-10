import {
    createContext,
    useContext,
    useCallback,
    useRef,
} from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { useSetAtom } from "jotai";
import { kubernetesResourceAtom } from "./cache";
import { makeKubePath, KubeUrlComponents } from "./routes";
import { GenericKubernetesResource } from "./types";
import { ResourceCacheEntry } from "./cache";

const updateResourceInList = (list: GenericKubernetesResource[], newItem: GenericKubernetesResource): GenericKubernetesResource[] => {
    const index = list.findIndex(r => r.metadata.uid === newItem.metadata.uid);
    if (index !== -1) {
        const newList = [...list];
        newList[index] = newItem;
        return newList;
    }
    return [...list, newItem];
};

const removeResourceFromList = (list: GenericKubernetesResource[], item: GenericKubernetesResource): GenericKubernetesResource[] => {
    return list.filter(r => r.metadata.uid !== item.metadata.uid);
};

const getEntry = (map: { [key: string]: ResourceCacheEntry }, key: string): ResourceCacheEntry => {
    return map[key] || { resources: [], isLoading: false };
}


type InternalSubscriptionEvent<T> =
    | {
        event: "apply" | "delete" | "initApply";
        data: { resource: T };
    }
    | { event: "init" | "initDone" };

interface SubscriptionContextType {
    subscribe: (resource: KubeUrlComponents) => () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const useSubscriptionContext = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error(
            "useSubscriptionContext must be used within a ResourceSubscriptionProvider"
        );
    }
    return context;
};

interface ActiveSubscription {
    count: number;
    taskId: number;
    channel: Channel<InternalSubscriptionEvent<GenericKubernetesResource>>;
    seenUids: Set<string>; // For stale-while-revalidate during init
    initializing: boolean;
}

export const ResourceSubscriptionProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const setAllResources = useSetAtom(kubernetesResourceAtom);

    // Map key is result of makeKubePath(resource)
    const subscriptions = useRef<Map<string, ActiveSubscription>>(new Map());

    const handleEvent = useCallback(
        (
            key: string,
            event: InternalSubscriptionEvent<GenericKubernetesResource>
        ) => {
            const sub = subscriptions.current.get(key);
            if (!sub) return;

            switch (event.event) {
                case "init":
                    sub.initializing = true;
                    sub.seenUids.clear();
                    sub.initializing = true;
                    sub.seenUids.clear();
                    setAllResources((prev) => {
                        const current = prev[key] || { resources: [], isLoading: false };
                        return { ...prev, [key]: { ...current, isLoading: true } };
                    });
                    break;

                case "initApply":
                    sub.seenUids.add(event.data.resource.metadata.uid);
                    setAllResources((prevCache) => {
                        const currentEntry = getEntry(prevCache, key);
                        const newList = updateResourceInList(currentEntry.resources, event.data.resource);
                        return {
                            ...prevCache,
                            [key]: { ...currentEntry, resources: newList },
                        };
                    });
                    break;

                case "initDone":
                    sub.initializing = false;
                    setAllResources((prevCache) => {
                        const currentEntry = getEntry(prevCache, key);
                        const filtered = currentEntry.resources.filter((r) =>
                            sub.seenUids.has(r.metadata.uid)
                        );

                        return {
                            ...prevCache,
                            [key]: { ...currentEntry, resources: filtered, isLoading: false },
                        };
                    });
                    break;

                case "apply":
                    setAllResources((prevCache) => {
                        const currentEntry = getEntry(prevCache, key);
                        const newList = updateResourceInList(currentEntry.resources, event.data.resource);
                        return {
                            ...prevCache,
                            [key]: { ...currentEntry, resources: newList },
                        };
                    });
                    break;

                case "delete":
                    setAllResources((prevCache) => {
                        const currentEntry = getEntry(prevCache, key);
                        const newList = removeResourceFromList(currentEntry.resources, event.data.resource);
                        return {
                            ...prevCache,
                            [key]: { ...currentEntry, resources: newList },
                        };
                    });
                    break;
            }
        },
        [setAllResources]
    );

    const subscribe = useCallback(
        (resource: KubeUrlComponents) => {
            const key = makeKubePath(resource);
            let sub = subscriptions.current.get(key);

            if (sub) {
                sub.count++;
                // If we are already subscribed, we might want to ensure the atom is populated? 
                // No, the atom is persistent.
            } else {
                // Start new subscription
                const taskId = Math.floor(Math.random() * 99999999);
                const channel = new Channel<
                    InternalSubscriptionEvent<GenericKubernetesResource>
                >();

                const newSub: ActiveSubscription = {
                    count: 1,
                    taskId,
                    channel,
                    seenUids: new Set(),
                    initializing: true,
                };
                subscriptions.current.set(key, newSub);
                subscriptions.current.set(key, newSub);
                setAllResources((prev) => {
                    const current = prev[key] || { resources: [], isLoading: false };
                    return { ...prev, [key]: { ...current, isLoading: true } };
                });
                sub = newSub;

                channel.onmessage = (msg) => {
                    handleEvent(key, msg);
                };

                console.log("Starting global subscription", key, taskId);
                invoke("start_listening", {
                    ...resource,
                    apiVersion: resource.api_version,
                    resourcePlural: resource.resource_plural,
                    channel,
                    subscriptionId: taskId,
                    namespaces: resource.namespaces,
                    // name/namespace handled by spread? check args.
                    // lib.rs: group, api_version, resource_plural, subscription_id, name?, namespace?, channel
                    // resource components has: group, api_version, resource_plural, namespace?, name?
                    // We need to match arguments specifically if proper fields aren't in `resource`.
                    // `KubeUrlComponents` has exactly these fields.
                }).catch((err) => {
                    console.error("Failed to start listening", err);
                    setAllResources((prev) => {
                        const current = prev[key] || { resources: [], isLoading: false };
                        return { ...prev, [key]: { ...current, isLoading: false } };
                    });
                    // Cleanup?
                    subscriptions.current.delete(key);
                });
            }

            // Return unsubscribe function
            return () => {
                const currentSub = subscriptions.current.get(key);
                if (!currentSub) return;

                currentSub.count--;
                if (currentSub.count <= 0) {
                    console.log("Stopping global subscription", key, currentSub.taskId);
                    invoke("stop_listen_task", { taskId: currentSub.taskId });
                    currentSub.channel.onmessage = () => { }; // No-op
                    subscriptions.current.delete(key);
                }
            };
        },
        [handleEvent]
    );

    return (
        <SubscriptionContext.Provider value={{ subscribe }}>
            {children}
        </SubscriptionContext.Provider>
    );
};
