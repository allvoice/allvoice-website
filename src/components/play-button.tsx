import React from "react";
import { type VoiceListElement } from "~/utils/api";
import { Pause } from "lucide-react";
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
    <div
      onClick={isPlayingThis ? stopSound : playSound}
      className="flex h-10 w-10 justify-center rounded-full border border-solid border-gray-400 p-2 align-middle text-gray-400 shadow hover:cursor-pointer hover:border-blue-400 hover:text-blue-400"
    >
      {isPlayingThis ? (
        <Pause className="mt-[1px] h-5 w-5" />
      ) : (
        <span>{sound.iconEmoji}</span>
      )}
    </div>
  );
};
