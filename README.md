# Autodiff
A user interface designed for Kubernetes cluster administrators operating clusters at scale. Heavily inspired by `k9s`, the best Kubernetes client out there.

Designing mostly around my needs as a Kubernetes engineer at a large organisation, focusing on:
- Quick traversal between namespaces, resource types, and resources
  - Keybinds essential, minimal mouse usage (except for deep inspection)
- Performance at scale is critical
  - 5,000+ pods, 20+ namespaces, lots of custom resource definitions, custom operators, ArgoCD, Kargo, etc
  - Designed with relative namespace isolation in mind
- Advanced control over how Autodiff connects to Kubernetes
  - Proxy server, proxy script to generate credentials (common in enterprise setups)
- Moving beyond limitations in `k9s`
  - [ ] Powerful manipulation of logs
  - [ ] Tabs
  - [ ] Click-to-sort 

### Architecture
- Tauri app (Rust + System WebView), good trade-off of performance while easily cross-platform and quick to develop
- Backend is Rust
  - Uses `kube` package to pass calls to Kubernetes
- Frontend is React
  - Radix UI with custom changes to make minimal and clean interface
  - Recoil for caching resources on client
- Frontend passes HTTP path and query through to backend which proxies it to Kubernetes control plane
  - There are security concerns here, in the future the backend will have to do some validation
  - In the future I would like the backend to be doing caching (possibly using `kube::Discovery`)
  - Probably move towards strictly defined command calls over `exec_raw`

### Screenshots and videos
![pods](readme/pods.png)

### Copyright
MIT. Go support [k9s](https://k9scli.io/), genuinely one of the best tools ever made in the Kubernetes world.