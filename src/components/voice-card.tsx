import {
  DocumentDuplicateIcon,
  HeartIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import { type VoiceListElement } from "~/utils/api";

import Link from "next/link";
import { PlayButton } from "~/components/play-button";

type Props = {
  voice: VoiceListElement;
};

// const likedTheme = "text-pink-400 hover:cursor-pointer";
const notLikedTheme = "text-gray-400 hover:cursor-pointer hover:text-pink-400";

const VoiceCard: React.FC<Props> = ({ voice }) => {
  return (
    <li className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white shadow">
      <div className="flex flex-1 flex-col p-8">
        <h1 className="text-xl">{voice.name}</h1>
        <h2 className="text-sm">Version {voice?.modelVersions[0]?.version}</h2>
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
              className={`relative inline-flex w-0 flex-1 items-center justify-center gap-x-1 rounded-br-lg border border-transparent py-4 text-sm font-semibold ${notLikedTheme}`}
            >
              <HeartIcon className="h-5 w-5 " aria-hidden="true" />
              {voice.score}
            </a>
          </div>
        </div>
      </div>
    </li>
  );
};

export default VoiceCard;
