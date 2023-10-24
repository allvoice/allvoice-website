"use client";

import { useDebounce } from "@uidotdev/usehooks";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  CommandLoading,
} from "~/components/ui/command";
import { useOpenSearch } from "~/hooks/open-search-hook";
import { api } from "~/utils/api";
import { isEmpty } from "~/utils/array-util";

export function CommandBar() {
  const { open, setOpen } = useOpenSearch();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  const [input, setInput] = useState("");
  const debouncedInput = useDebounce(input, 500);
  const search = api.search.search.useQuery(
    { query: debouncedInput },
    { enabled: open }
  );

  const hasNPCs = !isEmpty(search.data?.npcs);
  const hasModels = !isEmpty(search.data?.models);

  return (
    <CommandDialog shouldFilter={false} open={open} onOpenChange={setOpen}>
      <CommandInput
        value={input}
        onValueChange={setInput}
        placeholder="Type a command or search..."
      />
      <CommandList>
        {/* {search.isLoading && (
          <CommandLoading>Fetching results...</CommandLoading>
        )} */}
        <CommandEmpty>No results found.</CommandEmpty>

        {hasNPCs && (
          <CommandGroup heading="NPCs">
            {search.data?.npcs.map((npc) => (
              <CommandItem key={npc.id}>
                <User className="mr-2 h-4 w-4" />
                <span>{npc.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(hasModels && hasNPCs) && <CommandSeparator alwaysRender={true} />}
        {hasModels && (
          <CommandGroup heading="Character Models">
            {search.data?.models.map((model) => (
              <CommandItem key={model.id}>
                <User className="mr-2 h-4 w-4" />
                <span>{model.voiceName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
