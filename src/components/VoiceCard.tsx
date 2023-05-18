import { DocumentDuplicateIcon, HeartIcon } from "@heroicons/react/20/solid";
import { type PreviewSound, type Voice, type VoiceModel } from "@prisma/client";
import { useState } from "react";
import { username, loremIpsum } from "react-lorem-ipsum";

const PlayButton: React.FC<{ icon: string }> = ({ icon }) => {
  return (
    <div className="rounded-full border border-solid border-gray-400 p-2 text-gray-400 shadow hover:cursor-pointer hover:border-blue-400 hover:text-blue-400">
      {icon}
    </div>
  );
};

type Props = {
  voice: Voice & {
    modelVersions: (VoiceModel & { previewSounds: PreviewSound[] })[];
  };
};

const VoiceCard: React.FC<Props> = ({ voice }) => {
  const [favorited, setFavorited] = useState(Math.random() > 0.5); // TODO
  const notFavoritedTheme =
    "text-gray-400 hover:cursor-pointer hover:text-pink-400";
  const favoritedTheme =
    "text-pink-400 hover:cursor-pointer hover:text-gray-400";

  return (
    <li className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white shadow">
      <div className="flex flex-1 flex-col p-8">
        <h1 className="text-xl">{voice.name}</h1>
        <h2 className="text-sm">Version {voice?.modelVersions[0]?.version}</h2>
        <div className="my-2 flex space-x-3">
          {voice.modelVersions[0]?.previewSounds.map((preview) => (
            <PlayButton icon={preview.iconEmoji} />
          ))}
        </div>
      </div>
      <div>
        <div className="-mt-px flex divide-x divide-gray-200">
          <div className="flex w-0 flex-1">
            <a className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-400  hover:cursor-pointer hover:text-blue-400">
              <DocumentDuplicateIcon className="h-5 w-5" aria-hidden="true" />
              Clone
            </a>
          </div>
          <div className="-ml-px flex w-0 flex-1">
            <a
              className={`relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold ${
                favorited ? favoritedTheme : notFavoritedTheme
              }`}
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
