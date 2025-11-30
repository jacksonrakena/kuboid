import "@radix-ui/colors/gray.css";
import "@radix-ui/colors/blue.css";
import "@radix-ui/colors/green.css";
import "@radix-ui/colors/red.css";
import "@radix-ui/colors/gray-dark.css";
import "@radix-ui/colors/blue-dark.css";
import "@radix-ui/colors/green-dark.css";
import "@radix-ui/colors/red-dark.css";
import "@radix-ui/themes/styles.css";
import { Button, DropdownMenu, Flex, IconButton } from "@radix-ui/themes";
import { ResourceTypeList } from "./panes/resource-type-list/ResourceTypeList";
import { Outlet, useNavigate } from "react-router";
import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import { QuickSwitch } from "./popups/QuickSwitch";
import { useAtomValue } from "jotai";
import { currentConfigAtom } from "./util/kube/context";
import { NoSelect } from "./util/platform";

const StatusSection = () => {
  const currentConfig = useAtomValue(currentConfigAtom);
  const navigate = useNavigate();
  return (
    <Flex
      style={{
        paddingLeft: "16px",
        paddingRight: "16px",
        paddingBottom: "16px",
      }}
      direction={"column"}
      data-tauri-drag-region
      gap="3"
    >
      <Flex
        justify={"end"}
        style={{ paddingTop: "16px" }}
        data-tauri-drag-region
      >
        <Flex gap="5" data-tauri-drag-region>
          <IconButton
            variant="ghost"
            color="gray"
            disabled={window.history.state?.idx === 0}
            onClick={() => window.history.back()}
          >
            <ArrowLeftIcon />
          </IconButton>
          <IconButton
            variant="ghost"
            color="gray"
            disabled={window.history.state?.idx === window.history.length - 1}
            onClick={() => window.history.forward()}
          >
            <ArrowRightIcon />
          </IconButton>
        </Flex>
      </Flex>

      <Flex style={{ fontWeight: "bold", paddingLeft: "10px" }}>
        {/* <NoSelect>{currentConfig?.["current-context"]}</NoSelect> */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="ghost" size="3" color="gray" highContrast>
              {currentConfig?.["current-context"]}
              <DropdownMenu.TriggerIcon />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content color="gray">
            <DropdownMenu.Label>Other contexts</DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onSelect={() => {
                navigate("/");
              }}
            >
              <ArrowLeftIcon /> Back
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>
    </Flex>
  );
};

function App() {
  return (
    <main className="container" style={{ height: "100vh" }}>
      <Flex
        style={{
          overflow: "clip",
          height: "100%",
        }}
      >
        <Flex
          gap="2"
          direction={"column"}
          style={{ borderRight: "1px solid var(--gray-6)" }}
        >
          <StatusSection />

          <ResourceTypeList />
        </Flex>
        <Outlet />
      </Flex>

      <QuickSwitch />
    </main>
  );
}

export default App;
