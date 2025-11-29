import { invoke } from "@tauri-apps/api/core";

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

export async function detailResource<T>(
  group: string,
  apiVersion: string,
  resourcePlural: string,
  name: string,
  namespace?: string
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await invoke("detail_resource", {
      group,
      apiVersion,
      resourcePlural,
      name,
      namespace,
    });
    if (typeof data === "string") {
      return { success: false, error: data };
    }
    return { success: true, data: data as T };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
