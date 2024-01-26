import { useState } from "react";
import createContextHook from "typesafe-context-hook";

export const { useOpenSearch, OpenSearchProvider } = createContextHook(
  "OpenSearch",
  () => {
    const [open, setOpen] = useState(false);
    return {
      open,
      setOpen,
    };
  },
);
