import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { UploadCloud } from "lucide-react";
import React, { useCallback, type FC, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/utils/api";
import { SeedSoundDisplay } from "~/components/seed-sound-display";
import { MAX_ACTIVE_SAMPLES } from "~/utils/consts";

const uploadFileFn = async (file: File, url: string): Promise<void> => {
  await axios.put(url, file, {
    headers: {
      "Content-Type": file.type,
    },
  });
};

type Props = {
  voiceModelId: string;
};

const SeedSoundUploader: FC<Props> = ({ voiceModelId }) => {
  const utils = api.useContext();
  const workspace = api.voices.getVoiceModelWorkspace.useQuery({
    voiceModelId,
  });
  const createUploadUrl = api.files.createUploadUrl.useMutation({
    async onSuccess(data) {
      await utils.voices.getVoiceModelWorkspace.cancel();
      utils.voices.getVoiceModelWorkspace.setData({ voiceModelId }, (old) => {
        return {
          ...old,
          seedSounds: [
            ...(old?.seedSounds ?? []),
            { id: data.fileId, active: true },
          ],
        };
      });
    },
  });
  const uploadFile = useMutation(
    async ({ file }: { file: File }) => {
      const { uploadUrl, fileId } = await createUploadUrl.mutateAsync({
        fileName: file.name,
        voiceModelId: voiceModelId,
      });
      await uploadFileFn(file, uploadUrl);
      return { fileId };
    },
    {
      onSettled(data) {
        void utils.voices.getVoiceModelWorkspace.invalidate({ voiceModelId });
        void utils.files.getSeedSound.invalidate({ id: data?.fileId });
      },
      onError(error, variables) {
        toast({
          title: "File Upload Error",
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          description: `${variables.file.name} did not upload. Error: ${error}`,
        });
      },
    }
  );

  const { toast } = useToast();

  const uploadInProgress = createUploadUrl.isLoading || uploadFile.isLoading;

  const onDropAccepted = useCallback(
    (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        void uploadFile.mutateAsync({ file: file });
      }
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: onDropAccepted,
    accept: { "audio/mpeg": [], "audio/ogg": [] },
    maxFiles: 0,
    maxSize: 10000000,
  });

  const inactiveSeedSounds = useMemo(
    () => workspace.data?.seedSounds.filter((sound) => !sound.active),
    [workspace.data?.seedSounds]
  );

  const activeSeedSounds = useMemo(
    () => workspace.data?.seedSounds.filter((sound) => sound.active),
    [workspace.data?.seedSounds]
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-1 flex flex-col space-y-2">
        <div className="flex h-96 flex-col space-y-1 overflow-y-auto rounded-md border">
          {inactiveSeedSounds != null && inactiveSeedSounds.length > 0 ? (
            inactiveSeedSounds.map((sound) => (
              <SeedSoundDisplay
                key={sound.id}
                seedSoundId={sound.id}
                voiceModelId={voiceModelId}
              />
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-sm text-slate-500">
              Drag samples here to stop them from being used during generation.
            </div>
          )}
        </div>
        <div
          className="border-input ring-offset-background focus-visible:ring-ring flex h-28 w-full flex-col items-center justify-center rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <div className="flex h-full w-full flex-col">
              <UploadCloud className="h-full w-full stroke-slate-200" />
              <span className="mx-auto text-sm text-slate-500">
                Click or drag mp3 or ogg files to upload.
              </span>
            </div>
          )}
          {uploadInProgress && <p>Uploading...</p>}
        </div>
      </div>

      <div className="relative col-span-2 h-full rounded-md border p-2">
        <div className="grid h-min w-full grid-cols-3 gap-2 ">
          {activeSeedSounds &&
            activeSeedSounds.map((sound) => (
              <SeedSoundDisplay
                key={sound.id}
                seedSoundId={sound.id}
                voiceModelId={voiceModelId}
              />
            ))}
        </div>

        <p className="absolute bottom-2 left-0 right-0 mx-auto text-center text-sm text-slate-500">
          {activeSeedSounds?.length ?? 0} / {MAX_ACTIVE_SAMPLES} samples active
        </p>
      </div>
    </div>
  );
};

export default SeedSoundUploader;
