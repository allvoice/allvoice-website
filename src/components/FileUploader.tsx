import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { api } from "~/utils/api";
import { useMutation } from "@tanstack/react-query";

const uploadFileFn = async (file: File, url: string): Promise<void> => {
  await axios.put(url, file, {
    headers: {
      "Content-Type": file.type,
    },
  });
};

const FileUploader: React.FC = () => {
  const createUploadUrl = api.files.createUploadUrl.useMutation();
  const uploadFile = useMutation(({ file, url }: { file: File; url: string }) =>
    uploadFileFn(file, url)
  );

  const uploadInProgress = createUploadUrl.isLoading || uploadFile.isLoading;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const file = acceptedFiles[0]!;
      if (file.type !== "audio/mpeg" || file.size > 25000000) {
        alert("File must be an MP3 and under 25MB");
        return;
      }

      try {
        const { uploadUrl } = await createUploadUrl.mutateAsync({
          fileName: file.name,
        });
        await uploadFile.mutateAsync({ file: file, url: uploadUrl });
        alert("File uploaded successfully");
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        alert("Error uploading file: " + e);
      }
    },
    [createUploadUrl, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag &apos;n&apos; drop some files here, or click to select files</p>
      )}
      {uploadInProgress && <p>Uploading...</p>}
    </div>
  );
};

export default FileUploader;
