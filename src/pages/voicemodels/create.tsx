import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import ThreeDotsFade from "~/components/spinner";
import { api } from "~/utils/api";

const CreatePage: NextPage = () => {
  const router = useRouter();
  const uniqueNPCId = (router.query.uniqueNPCId ?? "") as string;
  const characterModelId = router.query.characterModelId as string | undefined;
  const forkVoiceId = router.query.fork as string | undefined;

  const hasMutated = useRef(false);
  const [error, setError] = useState("");
  const createVoiceModel = api.voices.createVoiceModel.useMutation({
    onSuccess: async (voiceModelId) => {
      await router.push(`/voicemodels/${voiceModelId}/edit`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  useEffect(() => {
    if (hasMutated.current) return; // stop double mutate due to strict mode
    if (createVoiceModel.isPending) return;
    if (uniqueNPCId == null && characterModelId == null && forkVoiceId == null)
      return;

    createVoiceModel.mutate({
      characterModelId: characterModelId,
      uniqueNPCId: uniqueNPCId,
      forkVoiceId: forkVoiceId,
    });
    hasMutated.current = true;
  }, [characterModelId, createVoiceModel, forkVoiceId, uniqueNPCId]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      {createVoiceModel.isPending ? (
        <ThreeDotsFade className="w-10 text-blue-500" />
      ) : error ? (
        <p>{error}</p>
      ) : null}
    </div>
  );
};
export default CreatePage;
