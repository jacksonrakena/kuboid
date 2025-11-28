use futures_util::StreamExt;
use futures_util::TryStreamExt;
use k8s_openapi::api::core::v1::Pod;
use kube::api::DynamicObject;
use kube::discovery::ApiGroup;
use kube::runtime::watcher::Event;
use kube::runtime::watcher;
use kube::{Api, Client, Discovery};
use rand::SeedableRng;
use serde::Serialize;
use std::collections::HashMap;
use tauri::async_runtime::{Mutex, TokioJoinHandle};
use tauri::http::{Request, Uri};
use tauri::ipc::Channel;
use tauri::{async_runtime, Manager, State};


#[derive(Serialize,Clone)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "event", content = "data")]
enum ResourceListenEvent {
    InitApply {
        resource: serde_json::Value
    },
    Apply {
        resource: serde_json::Value
    },
    Delete {
        resource: serde_json::Value
    },
    Error {
        message: String
    },
    Close
}

/// Stops a running subscription by aborting the task associated with it.
#[tauri::command]
async fn stop_listen_task(
    state: CommandGlobalState<'_>,
    task_id: i32
) -> Result<(), String> {
    let mut state = state.lock().await;

    match state.task_map.remove(&task_id) {
        Some(handle) => {
            eprintln!("[{}] Stopping task with handle {}", task_id, handle.id());
            TokioJoinHandle::abort(&handle);
            Ok(())
        }
        None => {
            eprintln!("[{}] No task found to abort", task_id);
            Err(format!("[{}] No task found to abort", task_id))
        }
    }
}

#[tauri::command]
async fn start_listening(
    state: CommandGlobalState<'_>,
    group: String,
    version: String,
    api_version: String,
    kind: String,
    plural: String,
    subscription_id: i32,
    channel: Channel<ResourceListenEvent>
) -> Result<i32, String> {
    eprintln!("[{}] Starting task ({}/{}/{} {})", subscription_id, group, version, kind, plural);
    let mut state = state.lock().await;

    let ar = kube::discovery::ApiResource {
        group,
        version,
        api_version,
        kind,
        plural,
    };
    let api = Api::<DynamicObject>::all_with(state.kube_client.clone(), &ar);
    let wc = watcher::Config::default();

    state.task_map.insert(subscription_id, tokio::task::spawn(async move {
        let watch = watcher(api, wc);
        let mut items = watch.boxed();

        loop {
            let listen_result = items.try_next().await;
            match listen_result {
                Ok(Some(p)) => {
                    match p {
                        Event::InitApply(e) => {
                            let _ = channel.send(
                                ResourceListenEvent::InitApply {
                                    resource: serde_json::to_value(e).unwrap(),
                                }
                            );
                        },
                        Event::Apply(e) => {
                            let _ = channel.send(
                                    ResourceListenEvent::Apply {
                                        resource: serde_json::to_value(e).unwrap(),
                                    }
                            );
                        },
                        Event::Delete(e) => {
                            let _ = channel.send(
                                ResourceListenEvent::Delete {
                                    resource: serde_json::to_value(e).unwrap(),
                                }
                            );
                        },
                        _ => {
                            // InitDone, Init
                        }
                    }
                }
                Ok(None) => {
                    let _ = channel.send(ResourceListenEvent::Error {
                        message: "none value given from watcher".to_string()
                    });
                }
                Err(e) => {
                    let _ = channel.send(ResourceListenEvent::Error {
                        message: e.to_string()
                    });
                }
            }
        }
    }));
    Ok(subscription_id)
}

#[derive(Debug, serde::Serialize)]
struct XApiResource {
    kind: String,
    plural: String,
    api_version: String,
}

#[derive(Debug, serde::Serialize)]
struct XApiGroup {
    name: String,
    version: String,
    resources: Vec<XApiResource>,
}
impl XApiGroup {
    fn from_api_group(group: &ApiGroup) -> Self {
        XApiGroup {
            name: group.name().to_string(),
            version: group.preferred_version_or_latest().to_string(),
            resources: group
                .recommended_resources()
                .into_iter()
                .map(|res| XApiResource {
                    kind: res.0.kind.clone(),
                    plural: res.0.plural.clone(),
                    api_version: res.0.api_version.clone(),
                })
                .collect(),
        }
    }
}

#[tauri::command]
async fn list_api_resources(state: CommandGlobalState<'_>) -> Result<Vec<XApiGroup>, String> {
    let mut state = state.lock().await;

    // Lazily initialize discovery if needed
    if state.kube_discovery.is_none() {
        state.kube_discovery = Some(Discovery::new(state.kube_client.clone()));
    }

    // Move the Discovery out, run it, and put it back to avoid moving out of the MutexGuard field
    if let Some(mut discovery) = state.kube_discovery.take() {
        // If it has no groups yet, perform the run to populate cache
        let needs_run = discovery.groups().next().is_none();
        if needs_run {
            discovery = discovery.run().await.map_err(|e| e.to_string())?;
        }
        state.kube_discovery = Some(discovery);
    }

    let groups = state
        .kube_discovery
        .as_ref()
        .unwrap()
        .groups()
        .map(XApiGroup::from_api_group)
        .collect();

    Ok(groups)
}

#[tauri::command]
async fn exec_raw(state: CommandGlobalState<'_>, path: String) -> Result<String, String> {

    // Create a Kubernetes client
    let client = Client::try_default().await.map_err(|e| e.to_string())?;

    let response = client.request_text(
        Request::builder()
            .uri(path.parse::<Uri>().map_err(|e| e.to_string())?)
            .body("".into())
            .unwrap(),
    );
    let data = response.await.map_err(|e| e.to_string())?;
    Ok(data)
}

struct GlobalState {
    kube_client: Client,
    kube_discovery: Option<Discovery>,
    task_map: HashMap<i32, TokioJoinHandle<()>>,
}

type CommandGlobalState<'a> = State<'a, Mutex<GlobalState>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            async_runtime::block_on(async {
                let client = Client::try_default().await.unwrap();

                app.manage(Mutex::new(GlobalState {
                    kube_client: client.clone(),
                    kube_discovery: Some(Discovery::new(client)),
                    task_map: HashMap::new(),
                }));
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_api_resources,
            exec_raw,
            start_listening,
            stop_listen_task
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
