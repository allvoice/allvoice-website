import { PlusIcon } from "@heroicons/react/20/solid";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import MainLayout from "~/components/main-layout";
import ThreeDotsFade from "~/components/spinner";
import VoiceCardVZ from "~/components/voice-card-vz";
import { type VoiceListInput, api } from "~/utils/api";

const CharacterModelPage: NextPage = () => {
  const router = useRouter();
  const characterModelId = (router.query.characterModelId ?? "") as string;

  const characterModel = api.warcraft.getCharacterModel.useQuery(
    { characterModelId: characterModelId },
    { enabled: !!characterModelId },
  );

  const voiceListInput = {
    characterModelId: characterModelId,
  } as VoiceListInput;
  const voices = api.voices.listVoices.useQuery(voiceListInput, {
    enabled: !!characterModel,
  });

  if (characterModel.data == null || voices.data == null) {
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
          <h2 className="text-4xl font-bold text-gray-900">
            {characterModel.data.name}
          </h2>
          <Link
            href={`/voicemodels/create?characterModelId=${characterModelId}`}
            className="relative inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            New Voice
          </Link>
        </div>
        <div className="mt-2 flex h-20 flex-wrap items-center gap-x-2 gap-y-2 overflow-auto">
          {characterModel.data.uniqueNpcs.map((npc) => (
            <Link
              key={npc.id}
              href={`/npcs/${npc.id}`}
              className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500 transition-colors duration-150 hover:bg-gray-300 hover:text-gray-600"
            >
              {npc.name}
            </Link>
          ))}
        </div>
        <h3 className="mt-4 text-2xl font-medium">Voice Models</h3>

        <div className="mt-4 flex flex-wrap space-x-4 rounded-md border border-gray-200 dark:bg-gray-800">
          {voices.data.map((voice) => (
            <VoiceCardVZ
              key={voice.id}
              voice={voice}
              voiceListInput={voiceListInput}
              className="w-72 border-0"
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default CharacterModelPage;
