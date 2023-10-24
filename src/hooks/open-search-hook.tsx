import { useState } from "react";
import createContextHook from "~/utils/createContextHook";

export const [useOpenSearch, OpenSearchProvider] = createContextHook(
  "OpenSearch",
  () => {
    const [open, setOpen] = useState(false);
    return {
      open,
      setOpen,
    };
  }
);
