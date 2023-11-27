import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { env } from "~/env.mjs";
import { api } from "~/utils/api";
import { Button } from "./ui/button";
import NPCPicker from "./npc-picker";

const EditorStatusBar: React.FC = () => {
  const router = useRouter();
  const voiceModelId = (router.query.voiceModelId ?? "") as string;
  const workspace = api.voices.getVoiceModelWorkspace.useQuery(
    {
      voiceModelId,
    },
    { enabled: !!voiceModelId },
  );

  const inactiveSeedSounds = useMemo(
    () => workspace.data?.seedSounds.filter((sound) => !sound.active),
    [workspace.data?.seedSounds],
  );

  const activeSeedSounds = useMemo(
    () => workspace.data?.seedSounds.filter((sound) => sound.active),
    [workspace.data?.seedSounds],
  );

  const numActiveSounds = useMemo(
    () => activeSeedSounds?.length ?? 0,
    [activeSeedSounds?.length],
  );

  const numInactiveSounds = useMemo(
    () => inactiveSeedSounds?.length ?? 0,
    [inactiveSeedSounds?.length],
  );

  const objectName = useMemo(
    () =>
      workspace.data?.uniqueWarcraftNpcName ??
      workspace.data?.warcraftDisplayName ??
      "Unselected",
    [
      workspace.data?.uniqueWarcraftNpcName,
      workspace.data?.warcraftDisplayName,
    ],
  );
  const utils = api.useUtils();

  const updateWarcraftLink = api.voices.updateWarcraftLink.useMutation({
    onMutate: async ({
      voiceModelId,
      uniqueWarcraftNpcId,
      warcraftNpcDisplayId,
      clientSide,
    }) => {
      await utils.voices.getVoiceModelWorkspace.cancel();
      utils.voices.getVoiceModelWorkspace.setData({ voiceModelId }, (old) => {
        if (!old) {
          return old;
        }
        return {
          ...old,
          uniqueWarcraftNpcName: uniqueWarcraftNpcId
            ? clientSide?.name ?? undefined
            : undefined,
          warcraftDisplayName: warcraftNpcDisplayId
            ? clientSide?.name ?? undefined
            : undefined,
        };
      });
    },
    onSettled: () => {
      void utils.voices.getVoiceModelWorkspace.invalidate({ voiceModelId });
    },
  });
  const pickerText = useMemo(
    () =>
      `${
        workspace.data?.warcraftDisplayName ? "Character Model" : "NPC"
      }: ${objectName}`,
    [workspace.data?.warcraftDisplayName, objectName],
  );
  const [open, setOpen] = useState(false);

  const onSelectNPC = (id: string, name: string) => {
    updateWarcraftLink.mutate({
      voiceModelId,
      uniqueWarcraftNpcId: id,
      clientSide: {
        name: name,
      },
    });
    setOpen(false);
  };

  const onSelectCharacterModel = (id: string, name: string) => {
    updateWarcraftLink.mutate({
      voiceModelId,
      warcraftNpcDisplayId: id,
      clientSide: {
        name: name,
      },
    });
    setOpen(false);
  };

  return (
    <>
      <NPCPicker
        open={open}
        setOpen={setOpen}
        onSelectNPC={onSelectNPC}
        onSelectCharacterModel={onSelectCharacterModel}
      />
      <div className="flex h-6 w-full justify-between overflow-hidden  border-t bg-slate-50 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Button
            className="w-fit select-none px-1 font-normal text-slate-500 hover:bg-slate-200"
            variant={"ghost"}
            onClick={() => setOpen(true)}
            disabled={updateWarcraftLink.isPending}
          >
            {pickerText}
          </Button>
        </div>
        <div className="flex items-center">
          <span className="w-fit select-none text-center text-sm text-slate-500">
            {`Samples: ${numInactiveSounds} inactive, ${numActiveSounds}/${env.NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES} active`}
          </span>
        </div>
      </div>
    </>
  );
};

export default EditorStatusBar;
