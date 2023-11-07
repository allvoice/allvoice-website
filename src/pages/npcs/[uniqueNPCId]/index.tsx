import {
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import MainLayout from "~/components/main-layout";
import ThreeDotsFade from "~/components/spinner";
import { api } from "~/utils/api";
import { PlayButton } from "~/components/play-button";

const NPCPage: NextPage = () => {
  const router = useRouter();
  const uniqueNPCId = (router.query.uniqueNPCId ?? "") as string;

  const npc = api.warcraft.getUniqueNPC.useQuery(
    { uniqueNPCId: uniqueNPCId },
    { enabled: !!uniqueNPCId },
  );

  const voices = api.voices.listMostPopular.useQuery(
    { uniqueNPCId: uniqueNPCId },
    { enabled: !!uniqueNPCId },
  );

  if (npc.data == null || voices.data == null) {
    return (
      <MainLayout>
        <div className="flex items-end space-x-1">
          <h2 className="text-4xl font-bold">Loading</h2>
          <ThreeDotsFade className="w-10" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div>
        <div className="flex w-full justify-between">
          <h2 className="text-4xl font-bold text-gray-900">{npc.data.name}</h2>
          <Link
            href={`/voicemodels/create?uniqueNPCId=${uniqueNPCId}`}
            className="relative inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            New Voice
          </Link>
        </div>
        <div className="mt-2 flex items-center space-x-2">
          {npc.data.npcIds.map((id) => (
            <a
              key={id}
              href={`https://www.wowhead.com/wotlk/npc=${id}`}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500 transition-colors duration-150 hover:bg-gray-300 hover:text-gray-600"
            >
              ID: {id}
            </a>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <h3 className="mb-2 text-2xl font-medium">Voice Models</h3>
          {voices.data.map((voice) => (
            <div
              className="flex flex-col bg-white shadow rounded-lg p-4"
              key={voice.id}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">{voice.name}</h4>
                <div className="flex items-center space-x-2">
                  <ChevronUpIcon className="h-4 w-4 text-green-500" />
                  <span className="font-semibold">{voice.score}</span>
                  <ChevronDownIcon className="h-4 w-4 text-red-500" />
                </div>
              </div>
              <div className="mt-2">
                {voice.modelVersions?.[0]?.previewSounds.map((sound) => (
                  <PlayButton key={sound.id} sound={sound}  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </MainLayout>
  );
};

export default NPCPage;
