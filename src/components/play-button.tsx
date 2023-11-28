import React from "react";
import { Button } from "~/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useMemo } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { cn } from "~/utils/ui";

export const PlayButton: React.FC<{
  soundUrl: string;
  className?: string;
  dark?: boolean;
}> = ({ soundUrl, className, dark = false }) => {
  const { load, src, stop, playing } = useGlobalAudioPlayer();

  const isPlayingThis = useMemo(
    () => src == soundUrl && playing,
    [playing, soundUrl, src],
  );
  const playSound = () => {
    load(soundUrl, { autoplay: true, html5: true, format: "mp3" });
  };
  const stopSound = () => {
    stop();
  };
  return (
    <Button
      className={cn("rounded-md px-2 py-2 ", className)}
      onClick={isPlayingThis ? stopSound : playSound}
      variant={dark ? undefined : "ghost"}
    >
      {isPlayingThis ? (
        <Pause className={cn("h-5 w-5", dark ? "text-white" : "text-black")} />
      ) : (
        <Play className={cn("h-5 w-5", dark ? "text-white" : "text-black")} />
      )}
    </Button>
  );
};
