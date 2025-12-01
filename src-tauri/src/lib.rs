use futures_util::StreamExt;
use futures_util::TryStreamExt;
use kube::api::DynamicObject;
use kube::config::{AuthInfo, KubeConfigOptions, Kubeconfig};
use kube::discovery::ApiGroup;
use kube::runtime::{watcher, WatchStreamExt};
use kube::runtime::watcher::{watch_object, Event, InitialListStrategy, ListSemantic};
use kube::{Api, Client, Config, Discovery, Resource};
use serde::Serialize;
use std::collections::HashMap;
use std::fmt::Display;
use std::fs::exists;
use std::process::Command;
use futures_util::stream::BoxStream;
use tauri::async_runtime::{Mutex, TokioJoinHandle};
use tauri::http::{Request, Uri};
use tauri::ipc::Channel;
use tauri::{async_runtime, Manager, State};
use debug_ignore::DebugIgnore;


impl Display for ResourceListenEvent {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ResourceListenEvent::Init => write!(f, "Init"),
            ResourceListenEvent::InitDone => write!(f, "InitDone"),
            ResourceListenEvent::InitApply { .. } => write!(f, "InitApply"),
            ResourceListenEvent::Apply { .. } => write!(f, "Apply"),
            ResourceListenEvent::Delete { .. } => write!(f, "Delete"),
            ResourceListenEvent::Error { message } => write!(f, "Error: {}", message),
            ResourceListenEvent::SingleResourceNotFoundOrDeleted => write!(f, "SingleResourceNotFoundOrDeleted"),
        }
    }
}
#[derive(Serialize,Clone,Debug)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "event", content = "data")]
enum ResourceListenEvent {
    Init,
    InitDone,
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
    SingleResourceNotFoundOrDeleted,
}

impl From<Event<DynamicObject>> for ResourceListenEvent {
    fn from(value: Event<DynamicObject>) -> Self {
        match value {
            Event::Init => ResourceListenEvent::Init,
            Event::InitDone => ResourceListenEvent::InitDone,
            Event::InitApply(e) => ResourceListenEvent::InitApply {
                resource: serde_json::to_value(e).unwrap(),
            },
            Event::Apply(e) =>
                ResourceListenEvent::Apply {
                    resource: serde_json::to_value(e).unwrap(),
                },
            Event::Delete(e) =>
                ResourceListenEvent::Delete {
                    resource: serde_json::to_value(e).unwrap(),
                },
        }
    }
}

#[derive(Serialize,Clone,Debug)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "type", content = "info")]
enum KubeConfigOrigin {
    EnvironmentOrDefaultPath
}


#[derive(Serialize,Clone,Debug)]
#[serde(rename_all = "camelCase")]
struct ContextSourceInfo {
    contexts: Vec<String>,
    origin: KubeConfigOrigin
}

#[derive(Serialize,Clone,Debug)]
#[serde(rename_all = "camelCase")]
struct KubeConfigInfo {
    merged: Option<Kubeconfig>,
    sources: Vec<ContextSourceInfo>
}


/// Called by the client on startup to discover available kube contexts
#[tauri::command]
async fn list_kube_contexts(ctx: CommandGlobalState<'_>) -> Result<KubeConfigInfo, ()> {
    let mut kci = KubeConfigInfo {
        merged: None,
        sources: Vec::new()
    };

    // Reads from KUBECONFIG env var or default location (~/.kube/config)
    if let Ok(r) = Kubeconfig::read() {
        match kci.merged {
            Some(existing) => {
                if let Ok(new_merged) = existing.clone().merge(r) {
                    kci.merged = Some(new_merged);
                } else {
                    // if we can't merge, just keep the existing one
                    kci.merged = Some(existing);
                }
            },
            None => {
                let context_names: Vec<String> = r.contexts.iter().map(|c|c.name.clone()).collect();
                kci.merged = Some(r);
                kci.sources.push(ContextSourceInfo {
                    contexts: context_names,
                    origin: KubeConfigOrigin::EnvironmentOrDefaultPath
                });
            }
        }
    }
    let mut state = ctx.lock().await;

    state.kubeconfig = kci.merged.clone();
    Ok(kci)
}

/// Sets our state to use the client's desired kubeconfig
/// (usually selected from the list provided by list_kube_contexts)
#[tauri::command]
async fn start(ctx: CommandGlobalState<'_>, context_name: String) -> Result<(), String> {
    let mut state = ctx.lock().await;

    match &state.kubeconfig {
        Some(kubeconfig) => {
            state.kube_client = Client::try_from(Config::from_custom_kubeconfig(kubeconfig.clone(), &KubeConfigOptions {
                context: Some(context_name),
                cluster: None,
                user: None,
            }).await.unwrap()).map_err(|_| "invalid kubeconfig".to_string())?;
            Ok(())
        }
        None => {
            Err("kubeconfig not ready".parse().unwrap())
        }
    }
}

/// Retrieves detailed information about a specific Kubernetes resource.
#[tauri::command]
async fn detail_resource(
    state: CommandGlobalState<'_>,
    group: String,
    api_version: String,
    resource_plural: String,
    name: String,
    namespace: Option<String>,
) -> Result<serde_json::Value, String> {
    let state = state.lock().await;

    let ar = kube::discovery::ApiResource {
        group,
        api_version,
        plural: resource_plural,
        version: "".to_string(),
        kind: "".to_string(),
    };
    let api: Api<DynamicObject> = match namespace {
        Some(ns) => Api::namespaced_with(state.kube_client.clone(), &ns, &ar),
        None => Api::all_with(state.kube_client.clone(), &ar),
    };

    let obj = api.get(&name).await.map_err(|e| e.to_string())?;
    serde_json::to_value(obj).map_err(|e| e.to_string())
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
    api_version: String,
    resource_plural: String,
    subscription_id: i32,
    name: Option<String>,
    namespace: Option<String>,
    channel: Channel<ResourceListenEvent>
) -> Result<i32, String> {
    let mut state = state.lock().await;

    let ar = kube::discovery::ApiResource {
        group,
        api_version,
        plural: resource_plural,
        version: "".to_string(),
        kind: "".to_string(),
    };
    let api: Api<DynamicObject> = if let Some(ns) = namespace {
        Api::namespaced_with(state.kube_client.clone(), &ns, &ar)
    } else {
        Api::all_with(state.kube_client.clone(), &ar)
    };

    let mut wc = watcher::Config::default().streaming_lists();

    let join_handle = tokio::task::spawn(async move {
        match name {
            Some(name) => {
                let mut events = watch_object(api, &name).default_backoff().boxed();
                loop {
                    match events.try_next().await {
                        // object updated, created, or found
                        Ok(Some(Some(event))) => {
                            let listen_event = ResourceListenEvent::Apply {
                                resource: serde_json::to_value(event).unwrap(),
                            };
                            let _ = channel.send(listen_event);
                        },
                        // object deleted or not found
                        Ok(Some(None)) => {
                            let listen_event = ResourceListenEvent::SingleResourceNotFoundOrDeleted;
                            let _ = channel.send(listen_event);
                        },
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
            },
            None => {
                let mut events = watcher(api,wc).default_backoff().boxed();

                loop {
                    match events.try_next().await {
                        Ok(Some(p)) => {
                            let listen_event = ResourceListenEvent::from(p);
                            let _ = channel.send(listen_event);
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
            }
        }
    });
    eprintln!("[{}] Started task with handle {} ({})", subscription_id, join_handle.id(), DynamicObject::url_path(&ar, None));
    state.task_map.insert(subscription_id, join_handle);
    Ok(subscription_id)
}

#[derive(Debug, serde::Serialize)]
struct XApiResource {
    kind: String,
    plural: String,
    api_version: String,
    version: String,
    group: String,
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
                    version: res.0.version,
                    group: res.0.group.clone(),
                })
                .collect(),
        }
    }
}


#[derive(Debug, serde::Serialize)]
struct DebugInfo {
    open_tasks: i32
}

#[tauri::command]
async fn debug(state: CommandGlobalState<'_>) -> Result<DebugInfo, ()> {
    let mut state = state.lock().await;

    Ok(DebugInfo {
        open_tasks: state.task_map.len() as i32
    })
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
    kubeconfig: Option<Kubeconfig>,
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
                    kubeconfig: None
                }));
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_api_resources,
            exec_raw,
            start_listening,
            stop_listen_task,
            detail_resource,
            list_kube_contexts,
            start,
            debug
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
