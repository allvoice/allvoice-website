"use client";

import { useDebounce } from "@uidotdev/usehooks";
import { User } from "lucide-react";
import React, { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import { useOpenSearch } from "~/contexts/open-search-hook";
import { api } from "~/utils/api";
import { isEmpty } from "~/utils/array-util";
import ThreeDotsFade from "~/components/spinner";
import { useRouter } from "next/router";

const CommandBar: React.FC = () => {
  const router = useRouter();
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
  const debouncedInput = useDebounce(input, 400);
  const isDebouncedInputEmpty = debouncedInput == "";
  const search = api.search.search.useQuery(
    { query: debouncedInput },
    { enabled: open && !isDebouncedInputEmpty, staleTime: Infinity },
  );

  const hasNPCs = !isEmpty(search.data?.npcs);
  const hasModels = !isEmpty(search.data?.characterModels);

  const onSelectNPC = (id: string) => {
    void router.push(`/npcs/${id}`);
    setOpen(false);
  };

  const onSelectCharacterModel = (id: string) => {
    void router.push(`/charactermodels/${id}`);
    setOpen(false);
  };

  return (
    <CommandDialog shouldFilter={false} open={open} onOpenChange={setOpen}>
      <CommandInput
        value={input}
        onValueChange={setInput}
        placeholder="Type a command or search..."
      />
      <CommandList>
        {/* {search.isFetching && (
          <CommandLoading>Fetching results...</CommandLoading>
        )} */}
        <CommandEmpty>
          {search.isFetching ? (
            <ThreeDotsFade className="mx-auto h-5" />
          ) : (
            "No results found."
          )}
        </CommandEmpty>

        {hasNPCs && (
          <CommandGroup heading="NPCs">
            {search.data?.npcs.slice(0, 3).map((npc) => (
              <CommandItem
                key={npc.id}
                value={npc.name}
                onSelect={() => onSelectNPC(npc.id)}
              >
                <User className="mr-2 h-4 w-4" />
                <span>{npc.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasModels && hasNPCs && <CommandSeparator alwaysRender={true} />}
        {hasModels && (
          <CommandGroup heading="Character Models">
            {search.data?.characterModels.slice(0, 3).map((characterModel) => (
              <CommandItem
                key={characterModel.id}
                value={characterModel.voiceName}
                onSelect={() => onSelectCharacterModel(characterModel.id)}
              >
                <User className="mr-2 h-4 w-4" />
                <span>{characterModel.voiceName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandBar;
