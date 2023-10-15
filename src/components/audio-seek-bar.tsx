// from https://github.com/E-Kuerschner/useAudioPlayer/blob/main/examples/src/AudioSeekBar.tsx
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FunctionComponent,
  type MouseEvent,
} from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { cn } from "~/utils/ui";

interface AudioSeekBarProps {
  className?: string;
}

export const AudioSeekBar: FunctionComponent<AudioSeekBarProps> = ({
  className,
}) => {
  const { getPosition, duration, seek } = useGlobalAudioPlayer();
  const [pos, setPos] = useState(0);
  const frameRef = useRef<number>();

  const seekBarElem = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animate = () => {
      setPos(getPosition());
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [getPosition]);

  const goTo = useCallback(
    (event: MouseEvent) => {
      const { pageX: eventOffsetX } = event;

      if (seekBarElem.current) {
        const elementOffsetX = seekBarElem.current.offsetLeft;
        const elementWidth = seekBarElem.current.clientWidth;
        const percent = (eventOffsetX - elementOffsetX) / elementWidth;
        seek(percent * duration);
      }
    },
    [duration, seek]
  );

  if (duration === Infinity || duration === 0) return null;

  return (
    <div className={cn("w-full", className)} ref={seekBarElem} onClick={goTo}>
      <div
        style={{ width: `${(pos / duration) * 100}%` }}
        className={cn("h-full bg-black")}
      />
    </div>
  );
};
