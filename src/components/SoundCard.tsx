import { DocumentDuplicateIcon, HeartIcon } from "@heroicons/react/20/solid";
import { useState } from "react";
import { username, loremIpsum } from 'react-lorem-ipsum';

type Props = {
};

const PlayButton: React.FC<Props> = ({ }) => {
    const faces = ["😭", "🤬", "😁", "😐", "😰", "🥴"]
    const face = faces[Math.floor(Math.random() * faces.length)]
    return <div className="p-2 rounded-full border-gray-400 border border-solid shadow text-gray-400 hover:cursor-pointer hover:text-blue-400 hover:border-blue-400">
        {/* <PlayIcon className="h-5 w-5" aria-hidden="true" /> */}
        {face}
    </div>
}

const SoundCard: React.FC<Props> = ({ }) => {
    const playCount = Math.floor(Math.random() * 4) + 1;
    const [favorited, setFavorited] = useState(Math.random() > 0.5);
    const notFavoritedTheme = "text-gray-400 hover:cursor-pointer hover:text-pink-400";
    const favoritedTheme = "text-pink-400 hover:cursor-pointer hover:text-gray-400";

    return <li
        className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white shadow"
    >
        <div className="flex flex-1 flex-col p-8">
            <h1 className="text-xl">{username()}</h1>
            <div className="flex space-x-3 m-2">
                {Array.from({ length: playCount }, () => <PlayButton />)}
            </div>
            <div>
                {loremIpsum({ p: 1, avgSentencesPerParagraph: 3 })}
            </div>
        </div>
        <div>
            <div className="-mt-px flex divide-x divide-gray-200">
                <div className="flex w-0 flex-1">
                    <a
                        className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-400  hover:cursor-pointer hover:text-blue-400"
                    >
                        <DocumentDuplicateIcon className="h-5 w-5" aria-hidden="true" />
                        Clone
                    </a>
                </div>
                <div className="-ml-px flex w-0 flex-1">
                    <a
                        className={`relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold ${favorited ? favoritedTheme : notFavoritedTheme}`}
                    >
                        <HeartIcon className="h-5 w-5 " aria-hidden="true" />
                        {favorited ? "Favorited" : "Favorite"}
                    </a>
                </div>
            </div>
        </div>
    </li>;
}

export default SoundCard;