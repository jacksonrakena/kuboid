import { Box, Button, Flex } from "@radix-ui/themes";
import { WrappedLink } from "./util/platform";
import { useEffect, useState } from "react";
import { safeInvoke } from "./util/kube/requests";

export const Settings = () => {
  const [debugInfo, setDebugInfo] = useState<any>();
  useEffect(() => {
    (async () => {
      const result = await safeInvoke("debug");
      setDebugInfo(result);
    })();
  }, []);
  return (
    <Flex
      style={{ paddingTop: "64px", padding: "32px" }}
      data-tauri-drag-region
      direction="column"
      gap="16"
    >
      <Box>
        <WrappedLink to="/">Go home</WrappedLink>
      </Box>
      <Box>
        <h1>Debug</h1>
        {debugInfo && <pre>{JSON.stringify(debugInfo, null, 2)}</pre>}
        <Button
          onClick={async () => {
            const result = await safeInvoke("debug");
            console.log(result);
            setDebugInfo(result);
          }}
        >
          Refresh
        </Button>
      </Box>
    </Flex>
  );
};
