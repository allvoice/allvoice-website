import { type NextPage } from "next";
import { useState } from "react";
import FileUploader from "~/components/FileUploader";
import createContextHook from "~/utils/createContextHook";

export const [useUploadedFiles, UploadedFilesProvider] = createContextHook(
  "uploadedFiles",
  () => {
    const [fileIds, setFileIds] = useState<string[]>([]);

    return {
      fileIds,
      setFileIds,
    };
  }
);

const VoiceCreate: NextPage = () => {
  return (
    <UploadedFilesProvider>
      <FileUploader />
    </UploadedFilesProvider>
  );
};

export default VoiceCreate;
