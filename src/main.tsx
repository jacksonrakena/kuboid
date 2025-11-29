import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Theme } from "@radix-ui/themes";
import "./main.css";
import {
  createBrowserRouter,
  createMemoryRouter,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import { RouterProvider } from "react-router/dom";
import { ResourceTable } from "./ResourceTable";
import { ResourceInfo } from "./resourceInfo/ResourceInfo";
import { Provider } from "jotai";
import { YAMLPane } from "./resourceInfo/panes/global/YAMLPane";
import { OverviewPane } from "./resourceInfo/panes/global/OverviewPane";
import { EventsPane } from "./resourceInfo/panes/global/EventsPane";

const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      {
        // API/core group resources
        path: "api/:api_version/namespaces?/:namespace?/:resource_plural/:name",
        ErrorBoundary: RootErrorBoundary,
        Component: ResourceInfo,
        children: [
          {
            index: true,
            Component: OverviewPane,
          },
          {
            path: "yaml",
            Component: YAMLPane,
          },
          { path: "events", Component: EventsPane },
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
          },
          {
            path: "yaml",
            Component: YAMLPane,
          },
          { path: "events", Component: EventsPane },
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
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Theme>
      <Provider>
        <RouterProvider router={router} />
      </Provider>
    </Theme>
  </React.StrictMode>
);

function RootErrorBoundary() {
  let error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </>
    );
  } else if (error instanceof Error) {
    return (
      <div>
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
