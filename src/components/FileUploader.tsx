import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { api } from "~/utils/api";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "~/components/ui/use-toast";

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

  const { toast } = useToast();

  const uploadInProgress = createUploadUrl.isLoading || uploadFile.isLoading;

  const onDropAccepted = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        try {
          const { uploadUrl } = await createUploadUrl.mutateAsync({
            fileName: file.name,
          });
          await uploadFile.mutateAsync({ file: file, url: uploadUrl });
          toast({
            title: "File Upload Complete",
            description: `${file.name} uploaded successfully`,
          });
        } catch (e) {
          toast({
            title: "File Upload Error",
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            description: `${file.name} did not upload. Error: ${e}`,
          });
        }
      }
    },
    [createUploadUrl, toast, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: onDropAccepted,
    accept: { "audio/mpeg": [] },
    maxFiles: 25,
    maxSize: 25000000,
  });

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
