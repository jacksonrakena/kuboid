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
use std::sync::MutexGuard;
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

    kill_all_tasks(&mut state);
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

fn kill_all_tasks(
    state: &mut tokio::sync::MutexGuard<GlobalState>,
) {
    let task_ids: Vec<i32> = state.task_map.keys().cloned().collect();
    for task_id in task_ids {
        kill_task_internal(state, task_id);
    }
}

fn kill_task_internal(
    state: &mut tokio::sync::MutexGuard<GlobalState>,
    task_id: i32
) -> Option<()> {
    match state.task_map.remove(&task_id) {
        Some(task_handle) => {
            eprintln!("[{}] Stopping task with handle {}", task_id, task_handle.handle.id());
            TokioJoinHandle::abort(&task_handle.handle);
            Some(())
        }
        None => {
            eprintln!("[{}] No task found to abort", task_id);
            None
        }
    }
}
/// Stops a running subscription by aborting the task associated with it.
#[tauri::command]
async fn stop_listen_task(
    state: CommandGlobalState<'_>,
    task_id: i32
) -> Result<(), String> {
    let mut state = state.lock().await;

    // 1. Remove Bridge Task
    if let Some(task_handle) = state.task_map.remove(&task_id) {
         eprintln!("[{}] Stopping bridge task", task_id);
         TokioJoinHandle::abort(&task_handle.handle);

         // 2. Decrement Ref Count on Shared Watcher
         let key = SubscriptionKey {
             group: task_handle.metadata.group,
             api_version: task_handle.metadata.api_version,
             resource_plural: task_handle.metadata.resource_plural,
             namespace: task_handle.metadata.namespace,
             name: task_handle.metadata.name,
         };

         if let Some(shared) = state.watchers.get_mut(&key) {
             shared.ref_count -= 1;
             eprintln!("[{}] Decremented ref count for {:?} to {}", task_id, key, shared.ref_count);
             if shared.ref_count == 0 {
                 eprintln!("[{}] Stopping source task for {:?}", task_id, key);
                 TokioJoinHandle::abort(&shared.source_task);
                 state.watchers.remove(&key);
             }
         }
         Ok(())
    } else {
        Err("no such task".to_string())
    }
}

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct TaskMetadata {
    id: i32,
    group: String,
    api_version: String,
    resource_plural: String,
    name: Option<String>,
    namespace: Option<String>,
    // We don't need to serialize the key itself to frontend if not needed,
    // but we need it in the TaskHandle struct or accessible via these fields.
    // Constructing SubscriptionKey from these fields is easy.
}

struct TaskHandle {
    handle: TokioJoinHandle<()>,
    metadata: TaskMetadata
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
    
    // 1. Construct the key
    let key = SubscriptionKey {
        group: group.clone(),
        api_version: api_version.clone(),
        resource_plural: resource_plural.clone(),
        namespace: namespace.clone(),
        name: name.clone(),
    };

    let mut state = state.lock().await;

    // 2. Check or Create Source Task
    let is_new = !state.watchers.contains_key(&key);
    
    if is_new {
        let (tx, _rx) = tokio::sync::broadcast::channel(100);
        let cache = Arc::new(RwLock::new(HashMap::new()));

        let ar = kube::discovery::ApiResource {
            group: group.clone(),
            api_version: api_version.clone(),
            plural: resource_plural.clone(),
            version: "".to_string(),
            kind: "".to_string(),
        };
        let api: Api<DynamicObject> = if let Some(ns) = &namespace {
            Api::namespaced_with(state.kube_client.clone(), ns, &ar)
        } else {
            Api::all_with(state.kube_client.clone(), &ar)
        };
        let mut wc = watcher::Config::default().streaming_lists();

        let tx_clone = tx.clone();
        let cache_clone = cache.clone();
        let name_clone = name.clone();
        
        // Spawn Source Task
        let source_handle = tokio::task::spawn(async move {
             match name_clone {
                Some(name) => {
                    let mut events = watch_object(api, &name).default_backoff().boxed();
                    loop {
                        match events.try_next().await {
                            Ok(Some(Some(event))) => {
                                let listen_event = ResourceListenEvent::Apply {
                                    resource: serde_json::to_value(&event).unwrap(), // Clone event?
                                };
                                let _ = tx_clone.send(listen_event);
                                
                                // Update Cache
                                let uid = event.metadata.uid.clone().unwrap_or_default();
                                if let Ok(mut c) = cache_clone.write() {
                                    if let Ok(val) = serde_json::to_value(event) {
                                         c.insert(uid, val);
                                    }
                                }
                            },
                             Ok(Some(None)) => {
                                let listen_event = ResourceListenEvent::SingleResourceNotFoundOrDeleted;
                                let _ = tx_clone.send(listen_event);
                                // Clear cache? Or assume client handles it.
                                // For single resource watch, simpler to not cache aggressively or clear all.
                                if let Ok(mut c) = cache_clone.write() {
                                    c.clear();
                                }
                            },
                            Ok(None) => {
                                let _ = tx_clone.send(ResourceListenEvent::Error {
                                    message: "none value given from watcher".to_string()
                                });
                            }
                            Err(e) => {
                                let _ = tx_clone.send(ResourceListenEvent::Error {
                                    message: e.to_string()
                                });
                            }
                        }
                    }
                },
                None => {
                    let mut events = watcher(api, wc).default_backoff().boxed();
                    loop {
                        match events.try_next().await {
                            Ok(Some(p)) => {
                                let listen_event = ResourceListenEvent::from(p.clone());
                                let _ = tx_clone.send(listen_event);
                                
                                // Maintain Cache
                                if let Ok(mut c) = cache_clone.write() {
                                    match p {
                                        Event::Apply(obj) => {
                                            if let Some(uid) = &obj.metadata.uid {
                                                if let Ok(val) = serde_json::to_value(&obj) {
                                                    c.insert(uid.clone(), val);
                                                }
                                            }
                                        },
                                        Event::Delete(obj) => {
                                            if let Some(uid) = &obj.metadata.uid {
                                                c.remove(uid);
                                            }
                                        },
                                        Event::InitApply(obj) => {
                                            if let Some(uid) = &obj.metadata.uid {
                                                if let Ok(val) = serde_json::to_value(&obj) {
                                                    c.insert(uid.clone(), val);
                                                }
                                            }
                                        },
                                        Event::Init => {
                                            c.clear();
                                        }
                                        // InitDone nothing
                                        _ => {}
                                    }
                                }
                            }
                            Ok(None) => {
                                let _ = tx_clone.send(ResourceListenEvent::Error {
                                    message: "none value given from watcher".to_string()
                                });
                            }
                            Err(e) => {
                                let _ = tx_clone.send(ResourceListenEvent::Error {
                                    message: e.to_string()
                                });
                            }
                        }
                    }
                }
            }
        });

        eprintln!("[{}] Started NEW source task for key {:?}", subscription_id, key);
        
        state.watchers.insert(key.clone(), SharedWatcher {
            tx,
            cache,
            source_task: source_handle,
            ref_count: 0
        });
    } else {
        eprintln!("[{}] Reusing existing source task for key {:?}", subscription_id, key);
    }

    // 3. Increment Ref Count & attach
    let shared = state.watchers.get_mut(&key).unwrap();
    shared.ref_count += 1;
    let mut rx = shared.tx.subscribe();
    let cache_access = shared.cache.clone();

    // 4. Spawn Bridge Task
    let bridge_handle = tokio::task::spawn(async move {
        // Only perform artificial replay if we are joining an EXISTING stream.
        // If it's NEW, the source task will naturally emit Init/InitDone to the channel.
        if !is_new {
            // A. Send Init
            let _ = channel.send(ResourceListenEvent::Init);
            
            // B. Replay Cache
            // Scope the lock
            {
                if let Ok(cache) = cache_access.read() {
                    for (_, val) in cache.iter() {
                        let _ = channel.send(ResourceListenEvent::InitApply {
                            resource: val.clone()
                        });
                    }
                }
            } // lock released

            // C. Send InitDone
            let _ = channel.send(ResourceListenEvent::InitDone);
        }

        // D. Loop Broadcast
        loop {
            match rx.recv().await {
                Ok(msg) => {
                    // Send to Tauri channel
                    if let Err(_) = channel.send(msg) {
                        // Channel closed by frontend
                        break;
                    }
                },
                Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                     eprintln!("Bridge task lagged by {} messages", n);
                     let _ = channel.send(ResourceListenEvent::Init);
                     // If we lagged, we might need to resync.
                     // For now, sending Init might trigger a refresh if the frontend handles it,
                     // but frontend Init logic is "Stale-While-Revalidate".
                     // The source task continues sending Apply.
                     // This is a complex edge case for deduplication.
                },
                Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                    break;
                }
            }
        }
    });

    // 5. Register Bridge Task in task_map
    let metadata = TaskMetadata {
        id: subscription_id,
        group,
        api_version,
        resource_plural,
        name,
        namespace,
    };
    state.task_map.insert(subscription_id, TaskHandle {
        handle: bridge_handle,
        metadata
    });

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
#[serde(rename_all = "camelCase")]
struct WatcherDebugInfo {
    key: String, // Simplified string representation
    ref_count: usize,
    cache_size: usize,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DebugInfo {
    open_tasks: i32,
    tasks: Vec<TaskMetadata>,
    watchers: Vec<WatcherDebugInfo>,
}

#[tauri::command]
async fn debug(state: CommandGlobalState<'_>) -> Result<DebugInfo, ()> {
    let state = state.lock().await;

    let tasks: Vec<TaskMetadata> = state.task_map.values().map(|t| t.metadata.clone()).collect();
    
    let watchers: Vec<WatcherDebugInfo> = state.watchers.iter().map(|(k, v)| {
        let cache_len = if let Ok(c) = v.cache.read() {
            c.len()
        } else {
            0
        };
        WatcherDebugInfo {
            key: format!("{}/{}/{}", k.group, k.api_version, k.resource_plural),
            ref_count: v.ref_count,
            cache_size: cache_len
        }
    }).collect();

    Ok(DebugInfo {
        open_tasks: state.task_map.len() as i32,
        tasks,
        watchers
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

use std::sync::{Arc, RwLock};

#[derive(Hash, Eq, PartialEq, Clone, Debug)]
struct SubscriptionKey {
    group: String,
    api_version: String,
    resource_plural: String,
    namespace: Option<String>,
    name: Option<String>,
}

struct SharedWatcher {
    // To send control signals or just purely broadcast events
    tx: tokio::sync::broadcast::Sender<ResourceListenEvent>,

    // Latest state for "Replay" to new subscribers
    // stored as JSON values for simplicity since we broadcast JSON
    cache: Arc<RwLock<HashMap<String, serde_json::Value>>>,

    // Handle to the Source Task (to abort it when ref_count=0)
    source_task: TokioJoinHandle<()>,

    // Number of active Bridge Tasks using this source
    ref_count: usize,
}

struct GlobalState {
    kubeconfig: Option<Kubeconfig>,
    kube_client: Client,
    kube_discovery: Option<Discovery>,
    task_map: HashMap<i32, TaskHandle>,
    watchers: HashMap<SubscriptionKey, SharedWatcher>,
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
                    watchers: HashMap::new(),
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
