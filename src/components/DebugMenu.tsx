import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface TaskMetadata {
    id: number;
    group: string;
    apiVersion: string;
    resourcePlural: string;
    name: string | null;
    namespace: string | null;
}

interface WatcherDebugInfo {
    key: string;
    refCount: number;
    cacheSize: number;
}

interface DebugInfo {
    open_tasks: number;
    tasks: TaskMetadata[];
    watchers: WatcherDebugInfo[];
}

export function DebugMenu() {
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

    useEffect(() => {
        const fetchDebugInfo = async () => {
            try {
                const info = await invoke<DebugInfo>("debug");
                setDebugInfo(info);
            } catch (error) {
                console.error("Failed to fetch debug info:", error);
            }
        };

        fetchDebugInfo();
        const interval = setInterval(fetchDebugInfo, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!debugInfo) {
        return null;
    }

    return (
        <div
            style={{
                position: "fixed",
                bottom: "1rem",
                right: "1rem",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "white",
                padding: "1rem",
                borderRadius: "0.5rem",
                zIndex: 9999,
                maxWidth: "400px",
                maxHeight: "300px",
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: "0.8rem",
            }}
        >
            <h3 style={{ margin: "0 0 0.5rem 0", borderBottom: "1px solid #555" }}>
                Debug Info
            </h3>
            <div style={{ marginBottom: "0.5rem" }}>
                <strong>Open Bridge Tasks:</strong> {debugInfo.open_tasks}
            </div>

            <div style={{ marginBottom: "1rem", borderBottom: "1px solid #333", paddingBottom: "0.5rem" }}>
                <h4 style={{ margin: "0 0 0.25rem 0", color: "#ddd" }}>Active K8s Watchers (Source)</h4>
                {debugInfo.watchers.length === 0 ? (
                    <div style={{ color: "#888" }}>No active watchers</div>
                ) : (
                    <ul style={{ paddingLeft: "1rem", margin: 0 }}>
                        {debugInfo.watchers.map((w, i) => (
                            <li key={i} style={{ marginBottom: "0.25rem" }}>
                                <div style={{ wordBreak: "break-all" }}>{w.key}</div>
                                <div style={{ color: "#aaa", fontSize: "0.75rem" }}>
                                    RefCount: {w.refCount} | Cache: {w.cacheSize}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <h4 style={{ margin: "0 0 0.25rem 0", color: "#ddd" }}>Bridge Tasks (UI Subs)</h4>
                {debugInfo.tasks.length === 0 ? (
                    <div style={{ color: "#888" }}>No active tasks</div>
                ) : (
                    <ul style={{ paddingLeft: "1rem", margin: 0 }}>
                        {debugInfo.tasks.map((task) => {
                            const displayPath = task.apiVersion.startsWith(task.group)
                                ? task.apiVersion
                                : `${task.group}/${task.apiVersion}`;
                            return (
                                <li key={task.id} style={{ marginBottom: "0.25rem" }}>
                                    <div>
                                        <strong>[{task.id}]</strong> {displayPath}
                                    </div>
                                    <div style={{ color: "#aaa" }}>
                                        {task.resourcePlural}
                                        {task.namespace && ` / ${task.namespace}`}
                                        {task.name && ` / ${task.name}`}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
