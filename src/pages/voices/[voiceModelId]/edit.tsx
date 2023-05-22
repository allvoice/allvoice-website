import { X } from "lucide-react";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { type FC } from "react";
import SeedSoundUploader from "~/components/seed-sound-uploader";
import { api } from "~/utils/api";

type SeedSoundDisplayProps = {
  seedSoundId: string;
  voiceModelId: string;
};
const SeedSoundDisplay: FC<SeedSoundDisplayProps> = ({
  seedSoundId,
  voiceModelId,
}) => {
  const utils = api.useContext();

  const getSeedSound = api.files.getSeedSound.useQuery({ id: seedSoundId });
  const deleteSeedSound = api.files.deleteSeedSoundForVoiceModel.useMutation({
    async onMutate({ seedSoundId: deletedSoundId }) {
      await utils.voices.getVoiceModelWorkspace.cancel();
      utils.voices.getVoiceModelWorkspace.setData({ voiceModelId }, (old) => {
        return {
          ...old,
          seedSoundIds: [
            ...(old?.seedSoundIds.filter((id) => id != deletedSoundId) ?? []),
          ],
        };
      });
    },
    onSettled: () => {
      void utils.voices.getVoiceModelWorkspace.invalidate({ voiceModelId });
    },
  });

  if (getSeedSound.isLoading) return <p>{`${seedSoundId}: loading...`}</p>;
  if (!getSeedSound.data) return <p>{`${seedSoundId}: no data`}</p>;

  const sData = getSeedSound.data;
  const removeSoundFromVoice = () => {
    void deleteSeedSound.mutateAsync({ seedSoundId, voiceModelId });
  };
  return (
    <div>
      <p>
        {`${sData.name}: isUploaded: ${sData.uploadComplete.toString()}`}
        <button onClick={removeSoundFromVoice}>
          <X className="h-4 w-4" />
        </button>
      </p>
      {sData.uploadComplete && <audio src={sData.publicUrl} controls />}
    </div>
  );
};

const VoiceCreate: NextPage = () => {
  const router = useRouter();
  // validate this better later, possibly serverside before rendering the page
  const voiceModelId = (router.query.voiceModelId ?? "") as string;
  const workspace = api.voices.getVoiceModelWorkspace.useQuery({
    voiceModelId,
  });
  return (
    <>
      {workspace.data?.seedSoundIds.map((fileId) => (
        <SeedSoundDisplay
          key={fileId}
          voiceModelId={voiceModelId}
          seedSoundId={fileId}
        />
      ))}
      <SeedSoundUploader voiceModelId={voiceModelId} />
    </>
  );
};

export default VoiceCreate;
