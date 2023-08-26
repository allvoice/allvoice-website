import {
  DocumentDuplicateIcon,
  HeartIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { type VoiceListElement, api } from "~/utils/api";

const PlayButton: React.FC<{
  sound: VoiceListElement["modelVersions"][number]["previewSounds"][number];
}> = ({ sound }) => {
  const { load } = useGlobalAudioPlayer();

  const playSound = () => {
    load(sound.publicUrl, { autoplay: true, format: "mp3" });
  };
  return (
    <div
      onClick={playSound}
      className="rounded-full border border-solid border-gray-400 p-2 text-gray-400 shadow hover:cursor-pointer hover:border-blue-400 hover:text-blue-400"
    >
      {sound.iconEmoji}
    </div>
  );
};

type Props = {
  voice: VoiceListElement;
  initiallyLiked?: boolean;
};

const likedTheme = "text-pink-400 hover:cursor-pointer";
const notLikedTheme = "text-gray-400 hover:cursor-pointer hover:text-pink-400";

const VoiceCard: React.FC<Props> = ({ voice, initiallyLiked }) => {
  const [likedDisplay, setLikedDisplay] = useState(initiallyLiked);
  const toggleLiked = api.users.toggleLiked.useMutation();

  const utils = api.useContext();

  const { id: voiceId } = voice;
  const changeLiked = useCallback(async () => {
    setLikedDisplay(!likedDisplay);
    const { liked } = await toggleLiked.mutateAsync({
      voiceId,
    });
    setLikedDisplay(liked);
    void utils.voices.listNewest.invalidate();
  }, [likedDisplay, toggleLiked, voiceId, utils.voices.listNewest]);

  return (
    <li className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white shadow">
      <div className="flex flex-1 flex-col p-8">
        <h1 className="text-xl">{voice.name}</h1>
        <h2 className="text-sm">Version {voice?.modelVersions[0]?.version}</h2>
        <h3>{voice.warcraftNpcDisplay?.voiceName}</h3>
        <div className="my-2 flex space-x-3">
          {voice.modelVersions[0]?.previewSounds.map((sound) => (
            <PlayButton key={sound.id} sound={sound} />
          ))}
        </div>
      </div>
      <div>
        <div className="-mt-px flex divide-x divide-gray-200">
          <div className="flex w-0 flex-1">
            <a className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-1 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-400  hover:cursor-pointer hover:text-blue-400">
              <DocumentDuplicateIcon className="h-5 w-5" aria-hidden="true" />
              Clone
            </a>
          </div>
          <div className="flex w-0 flex-1">
            <Link
              href={`/voices/${voice.id}`}
              className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-1 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-400  hover:cursor-pointer hover:text-blue-400"
            >
              <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
              Details
            </Link>
          </div>
          <div className="-ml-px flex w-0 flex-1">
            <a
              className={`relative inline-flex w-0 flex-1 items-center justify-center gap-x-1 rounded-br-lg border border-transparent py-4 text-sm font-semibold ${
                likedDisplay ? likedTheme : notLikedTheme
              }`}
              onClick={changeLiked}
            >
              <HeartIcon className="h-5 w-5 " aria-hidden="true" />
              {voice.likes}
            </a>
          </div>
        </div>
      </div>
    </li>
  );
};

export default VoiceCard;
