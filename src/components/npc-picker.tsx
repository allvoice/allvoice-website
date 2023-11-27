"use client";

import { useDebounce } from "@uidotdev/usehooks";
import { User } from "lucide-react";
import React, { useState } from "react";

import ThreeDotsFade from "~/components/spinner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import { api } from "~/utils/api";
import { isEmpty } from "~/utils/array-util";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSelectNPC: (id: string, name: string) => void;
  onSelectCharacterModel: (id: string, name: string) => void;
};

const NPCPicker: React.FC<Props> = (props) => {
  const [input, setInput] = useState("");
  const debouncedInput = useDebounce(input, 400);
  const isDebouncedInputEmpty = debouncedInput == "";
  const search = api.search.search.useQuery(
    { query: debouncedInput },
    { enabled: props.open && !isDebouncedInputEmpty, staleTime: Infinity },
  );

  const hasNPCs = !isEmpty(search.data?.npcs);
  const hasModels = !isEmpty(search.data?.characterModels);

  return (
    <CommandDialog
      shouldFilter={false}
      open={props.open}
      onOpenChange={props.setOpen}
    >
      <CommandInput
        value={input}
        onValueChange={setInput}
        placeholder="Link a new NPC or Character Model"
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
                onSelect={() => props.onSelectNPC(npc.id, npc.name)}
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
                onSelect={() =>
                  props.onSelectCharacterModel(
                    characterModel.id,
                    characterModel.voiceName,
                  )
                }
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

export default NPCPicker;
