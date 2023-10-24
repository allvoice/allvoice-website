import { Pause, Play, X } from "lucide-react";
import { type FC, useState } from "react";
import { useDrag } from "react-dnd";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { api } from "~/utils/api";
import { ItemTypes } from "~/utils/dnd-itemtypes";
import { cn } from "~/utils/ui";

type SeedSoundDisplayProps = {
  seedSoundId: string;
  voiceModelId: string;
  className?: string;
};

export const SeedSoundDisplay: FC<SeedSoundDisplayProps> = ({
  seedSoundId,
  voiceModelId,
  className,
}) => {
  const utils = api.useContext();

  const [refetchSeedSound, setRefetchSeedSound] = useState(true);
  const getSeedSound = api.files.getSeedSound.useQuery(
    { id: seedSoundId },
    { refetchInterval: 5000, enabled: refetchSeedSound },
  );
  const deleteSeedSound = api.files.deleteSeedSoundForVoiceModel.useMutation({
    async onMutate({ seedSoundId: deletedSoundId }) {
      await utils.voices.getVoiceModelWorkspace.cancel();
      utils.voices.getVoiceModelWorkspace.setData({ voiceModelId }, (old) => {
        return {
          ...old,
          seedSounds: [
            ...(old?.seedSounds.filter((sound) => sound.id != deletedSoundId) ??
              []),
          ],
        };
      });
    },
    onSettled: () => {
      void utils.voices.getVoiceModelWorkspace.invalidate({ voiceModelId });
    },
  });

  const { load, src, stop, playing } = useGlobalAudioPlayer();

  const playSound = () => {
    load(sData.publicUrl, { autoplay: true, html5: true, format: "mp3" });
  };
  const stopSound = () => {
    stop();
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.SOURCE_SOUND,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    item: () => ({
      seedSoundId: seedSoundId,
    }),
  }));

  if (getSeedSound.isLoading) return <p>{`${seedSoundId}: loading...`}</p>;
  if (!getSeedSound.data) return <p>{`${seedSoundId}: no data`}</p>;

  const sData = getSeedSound.data;

  const isPlayingThis = src == sData.publicUrl && playing;

  if (sData.uploadComplete && refetchSeedSound == true) {
    setRefetchSeedSound(false);
  }

  const deleteSound = () => {
    void deleteSeedSound.mutateAsync({ seedSoundId, voiceModelId });
  };
  return (
    <div
      className={cn(
        "flex h-12 cursor-grab items-center space-x-2 rounded-md border p-2",
        {
          "bg-slate-100 opacity-50": isDragging,
        },
        className,
      )}
      ref={drag}
    >
      <div
        onClick={isPlayingThis ? stopSound : playSound}
        className="flex h-8 w-8 justify-center rounded-full border border-solid border-gray-400 p-2 align-middle text-gray-400 shadow hover:cursor-pointer hover:border-blue-400 hover:text-blue-400"
      >
        {isPlayingThis ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </div>
      <p className="truncate text-xs">{sData.name}</p>
      <button onClick={deleteSound}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
