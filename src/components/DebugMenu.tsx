import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface TaskMetadata {
    id: number;
    group: string;
    api_version: string;
    resource_plural: string;
    name: string | null;
    namespace: string | null;
}

interface DebugInfo {
    open_tasks: number;
    tasks: TaskMetadata[];
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
                <strong>Open Tasks:</strong> {debugInfo.open_tasks}
            </div>
            <div>
                <strong>Tasks:</strong>
                {debugInfo.tasks.length === 0 ? (
                    <div>No active tasks</div>
                ) : (
                    <ul style={{ paddingLeft: "1rem", margin: 0 }}>
                        {debugInfo.tasks.map((task) => (
                            <li key={task.id} style={{ marginBottom: "0.25rem" }}>
                                <div>
                                    <strong>[{task.id}]</strong> {task.group}/{task.api_version}
                                </div>
                                <div style={{ color: "#aaa" }}>
                                    {task.resource_plural}
                                    {task.namespace && ` / ${task.namespace}`}
                                    {task.name && ` / ${task.name}`}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
