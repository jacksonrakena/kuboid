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
                    // Do NOT clear the cache here. We want to keep effective cache until InitDone.
                    break;

                case "initApply":
                    sub.seenUids.add(event.data.resource.metadata.uid);
                    setAllResources((prevCache) => {
                        const currentList = prevCache[key] || [];
                        // Upsert
                        const exists = currentList.find(
                            (r) => r.metadata.uid === event.data.resource.metadata.uid
                        );
                        if (exists) {
                            // If it exists, replace it (it might be updated)
                            return {
                                ...prevCache,
                                [key]: currentList.map(r => r.metadata.uid === event.data.resource.metadata.uid ? event.data.resource : r)
                            }
                        }
                        return {
                            ...prevCache,
                            [key]: [...currentList, event.data.resource],
                        };
                    });
                    break;

                case "initDone":
                    sub.initializing = false;
                    // Prune resources that were NOT seen during init
                    setAllResources((prevCache) => {
                        const currentList = prevCache[key] || [];
                        const filtered = currentList.filter((r) =>
                            sub.seenUids.has(r.metadata.uid)
                        );

                        // Optimization: Only update if size changed? 
                        // But content might have changed in InitApply.
                        // We trust InitApply handled updates.
                        // We just need to handle deletions of stale items.

                        // Logic check: InitApply handles updates/inserts. 
                        // If an item was NOT in InitApply sequence, it's deleted.
                        // So filtering by seenUids is correct.

                        return {
                            ...prevCache,
                            [key]: filtered,
                        };
                    });
                    break;

                case "apply":
                    setAllResources((prevCache) => {
                        const currentList = prevCache[key] || [];
                        const newItem = event.data.resource;
                        // Remove old version if exists
                        const filtered = currentList.filter(
                            (r) => r.metadata.uid !== newItem.metadata.uid
                        );
                        return {
                            ...prevCache,
                            [key]: [...filtered, newItem],
                        };
                    });
                    break;

                case "delete":
                    setAllResources((prevCache) => {
                        const currentList = prevCache[key] || [];
                        const deletedItem = event.data.resource;
                        return {
                            ...prevCache,
                            [key]: currentList.filter(
                                (r) => r.metadata.uid !== deletedItem.metadata.uid
                            ),
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
                    // name/namespace handled by spread? check args.
                    // lib.rs: group, api_version, resource_plural, subscription_id, name?, namespace?, channel
                    // resource components has: group, api_version, resource_plural, namespace?, name?
                    // We need to match arguments specifically if proper fields aren't in `resource`.
                    // `KubeUrlComponents` has exactly these fields.
                }).catch((err) => {
                    console.error("Failed to start listening", err);
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
