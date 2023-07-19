import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { UploadCloud } from "lucide-react";
import React, { useCallback, type FC } from "react";
import { useDropzone } from "react-dropzone";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/utils/api";

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
  const createUploadUrl = api.files.createUploadUrl.useMutation({
    async onSuccess(data) {
      await utils.voices.getVoiceModelWorkspace.cancel();
      utils.voices.getVoiceModelWorkspace.setData({ voiceModelId }, (old) => {
        return {
          ...old,
          seedSoundIds: [...(old?.seedSoundIds ?? []), data.fileId],
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
      onSuccess(_data, variables) {
        toast({
          title: "File Upload Complete",
          description: `${variables.file.name} uploaded successfully`,
        });
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
    accept: { "audio/mpeg": [] },
    maxFiles: 0,
    maxSize: 10000000,
  });

  return (
    <div
      className="border-input ring-offset-background focus-visible:ring-ring flex h-40 w-60 flex-col items-center justify-center rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <UploadCloud className="h-full w-full stroke-slate-200" />
      )}
      {uploadInProgress && <p>Uploading...</p>}
    </div>
  );
};

export default SeedSoundUploader;
