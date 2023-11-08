import React from "react";
import { type VoiceListElement } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useMemo } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";

export const PlayButton: React.FC<{
  sound: VoiceListElement["modelVersions"][number]["previewSounds"][number];
}> = ({ sound }) => {
  const { load, src, stop, playing } = useGlobalAudioPlayer();

  const isPlayingThis = useMemo(
    () => src == sound.publicUrl && playing,
    [playing, sound.publicUrl, src],
  );
  const playSound = () => {
    load(sound.publicUrl, { autoplay: true, html5: true, format: "mp3" });
  };
  const stopSound = () => {
    stop();
  };
  return (
    <Button
      className=" rounded-md  bg-indigo-600 px-3 py-2  hover:bg-indigo-700"
      variant="outline"
      onClick={isPlayingThis ? stopSound : playSound}
    >
      {isPlayingThis ? (
        <Pause className="h-5 w-5 text-white" />
      ) : (
        <Play className="h-5 w-5 text-white" />
      )}
    </Button>
  );
};
