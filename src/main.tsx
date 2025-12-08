import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Theme } from "@radix-ui/themes";
import "./main.css";
import {
  createBrowserRouter,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import { RouterProvider } from "react-router/dom";
import { ResourceTable } from "./panes/resource-table/ResourceTable";
import { ResourceInfo } from "./panes/resource-info/ResourceInfo";
import { Provider } from "jotai";
import { YAMLPane } from "./panes/resource-info/panes/global/YAMLPane";
import { OverviewPane } from "./panes/resource-info/panes/global/OverviewPane";
import { EventsPane } from "./panes/resource-info/panes/global/EventsPane";
import { Home } from ".";
import { Settings } from "./settings";
import { Overview } from "./overview";
import { ResourceSubscriptionProvider } from "./util/kube/SubscriptionContext";
import { DebugMenu } from "./components/DebugMenu";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
    ErrorBoundary: RootErrorBoundary,
  },
  { path: "/settings", Component: Settings, ErrorBoundary: RootErrorBoundary },
  {
    path: "/app",
    Component: App,
    children: [
      {
        index: true,
        Component: Overview,
        ErrorBoundary: RootErrorBoundary,
      },
      {
        // Specific override for namespaces themselves, those special little namespaces :)
        path: "api/:api_version/namespaces/:name",
        ErrorBoundary: RootErrorBoundary,
        Component: ResourceInfo,
        children: [
          {
            index: true,
            Component: OverviewPane,
            ErrorBoundary: RootErrorBoundary,
          },
          {
            path: "yaml",
            ErrorBoundary: RootErrorBoundary,
            Component: YAMLPane,
          },
          {
            path: "events",
            Component: EventsPane,
            ErrorBoundary: RootErrorBoundary,
          },
        ],
      },
      {
        // API/core group resources
        path: "api/:api_version/namespaces?/:namespace?/:resource_plural/:name",
        ErrorBoundary: RootErrorBoundary,
        Component: ResourceInfo,
        children: [
          {
            index: true,
            Component: OverviewPane,
            ErrorBoundary: RootErrorBoundary,
          },
          {
            path: "yaml",
            ErrorBoundary: RootErrorBoundary,
            Component: YAMLPane,
          },
          {
            path: "events",
            Component: EventsPane,
            ErrorBoundary: RootErrorBoundary,
          },
        ],
      },
      {
        // Custom resources
        path: "apis/:api_group_domain/:api_group_version/namespaces?/:namespace?/:resource_plural/:name",
        ErrorBoundary: RootErrorBoundary,
        Component: ResourceInfo,
        children: [
          {
            index: true,
            Component: OverviewPane,
            ErrorBoundary: RootErrorBoundary,
          },
          {
            path: "yaml",
            ErrorBoundary: RootErrorBoundary,
            Component: YAMLPane,
          },
          {
            path: "events",
            Component: EventsPane,
            ErrorBoundary: RootErrorBoundary,
          },
        ],
      },
      {
        // API/core group resources
        path: "api/:api_version/:resource_plural",
        ErrorBoundary: RootErrorBoundary,
        Component: ResourceTable,
      },
      {
        // Custom resources
        path: "apis/:api_group_domain/:api_group_version/:resource_plural",
        ErrorBoundary: RootErrorBoundary,
        Component: ResourceTable,
      },
    ],
    ErrorBoundary: RootErrorBoundary,
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Theme accentColor="blue">
      <Provider>
        <ResourceSubscriptionProvider>
          <RouterProvider router={router} />
          <DebugMenu />
        </ResourceSubscriptionProvider>
      </Provider>
    </Theme>
  </React.StrictMode>
);

function RootErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <div data-tauri-drag-region>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    );
  } else if (error instanceof Error) {
    return (
      <div data-tauri-drag-region>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}
