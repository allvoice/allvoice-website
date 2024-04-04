import { type NextPage } from "next";
import { useRouter } from "next/router";
import MainLayout from "~/components/main-layout";
import { api } from "~/utils/api";

const VoicePage: NextPage = () => {
  const router = useRouter();
  // validate this better later, possibly serverside before rendering the page
  const voiceId = (router.query.voiceId ?? "") as string;
  const voiceDetails = api.voices.getVoiceDetails.useQuery(
    {
      voiceId: voiceId,
    },
    { enabled: voiceId != "" },
  );
  if (voiceDetails.isLoading) return <h2>Loading...</h2>;
  return (
    <MainLayout>
      <h1>{`${voiceDetails.data?.voiceName ?? ""}: ${voiceId}`}</h1>
      <div>
        {voiceDetails.data?.previewSounds?.map((previewSound) => (
          <div
            key={previewSound.id}
            className="flex flex-row items-center space-x-1"
          >
            <span>{previewSound.iconEmoji}</span>
            <audio src={previewSound.publicUrl} controls />
          </div>
        ))}
      </div>
    </MainLayout>
  );
};

export default VoicePage;
