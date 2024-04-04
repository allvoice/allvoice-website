import { useUser } from "@clerk/nextjs";
import { Pause, Play } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { env } from "~/env.mjs";
import { api } from "~/utils/api";
import { cn } from "~/utils/ui";
import { AudioSeekBar } from "./audio-seek-bar";
import NPCPickerEdit from "./npc-picker-edit";
import { Button } from "./ui/button";
import { useAllvoiceUser } from "~/contexts/allvoice-user";

type Props = {
  className?: string;
};

const StatusBar: React.FC<Props> = ({ className }) => {
  const router = useRouter();
  const clerk = useUser();

  const isVoiceModelEditPage =
    router.pathname === "/voicemodels/[voiceModelId]/edit";
  const isVoiceModelPostPage =
    router.pathname === "/voicemodels/[voiceModelId]/post";

  const voiceModelId = (router.query.voiceModelId ?? "") as string;
  const workspace = api.voices.getVoiceModelWorkspace.useQuery(
    {
      voiceModelId,
    },
    { enabled: isVoiceModelEditPage || isVoiceModelPostPage },
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

  const pickerText = useMemo(
    () =>
      workspace.data?.uniqueWarcraftNpcName ??
      workspace.data?.warcraftDisplayName ??
      "click to select npc",
    [
      workspace.data?.uniqueWarcraftNpcName,
      workspace.data?.warcraftDisplayName,
    ],
  );

  const { user } = useAllvoiceUser();

  const [open, setOpen] = useState(false);

  const { playing, togglePlayPause } = useGlobalAudioPlayer();

  return (
    <>
      <NPCPickerEdit
        voiceModelId={voiceModelId}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
      <div
        className={cn(
          "flex h-6 w-full items-center justify-between space-x-6 overflow-hidden border-t bg-slate-50 px-3 sm:px-6 lg:px-8",
          className,
        )}
      >
        <div className="flex ">
          {(isVoiceModelEditPage || isVoiceModelPostPage) && (
            <Button
              className="w-fit select-none whitespace-nowrap px-1 font-normal text-slate-500 hover:bg-slate-200"
              variant={"ghost"}
              onClick={() => setOpen(true)}
            >
              {pickerText}
            </Button>
          )}
        </div>

        <div className="flex h-full w-full max-w-lg items-center">
          <Button
            onClick={togglePlayPause}
            variant={"ghost"}
            className="w-fit select-none px-2 hover:bg-slate-200"
          >
            {playing ? (
              <Pause className="h-2 w-2 fill-slate-500 text-slate-500" />
            ) : (
              <Play className="h-2 w-2 fill-slate-500 text-slate-500" />
            )}
          </Button>

          <AudioSeekBar className="grow" />
        </div>
        <div className="flex space-x-6">
          {isVoiceModelEditPage && (
            <span className="w-fit whitespace-nowrap text-center text-sm text-slate-500">
              {`samples: ${numInactiveSounds} inactive, ${numActiveSounds}/${env.NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES} active`}
            </span>
          )}
          {clerk.isSignedIn && (
            <span className="w-fit whitespace-nowrap text-center text-sm text-slate-500">
              {!user.data
                ? "remaining characters: loading..."
                : `remaining characters: ${
                    user.data.elevenlabsCharacterQuota -
                    user.data.elevenlabsCharacterQuotaUsed
                  }`}
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default StatusBar;
