import { type NextPage } from "next";
import { useState } from "react";
import FileUploader from "~/components/FileUploader";
import createContextHook from "~/utils/createContextHook";

export const [useUploadedFiles, UploadedFilesProvider, withUploadedFiles] =
  createContextHook("uploadedFiles", () => {
    const [fileIds, setFileIds] = useState<string[]>([]);

    return {
      fileIds,
      setFileIds,
    };
  });

const VoiceCreate: NextPage = () => {
  return (
    <>
      <FileUploader />
    </>
  );
};

export default withUploadedFiles(VoiceCreate);
