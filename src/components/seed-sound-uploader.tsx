import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { UploadCloud } from "lucide-react";
import React, { useCallback, type FC, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/utils/api";
import { SeedSoundDisplay } from "~/components/seed-sound-display";
import { useDrop } from "react-dnd";
import { ItemTypes } from "~/utils/dnd-itemtypes";
import { env } from "~/env.mjs";

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
  const utils = api.useUtils();
  const { toast } = useToast();

  const workspace = api.voices.getVoiceModelWorkspace.useQuery(
    {
      voiceModelId,
    },
    { enabled: !!voiceModelId },
  );

  const updateSeedSound = api.voices.updateSeedSound.useMutation({
    async onMutate({ active, seedSoundId }) {
      await utils.voices.getVoiceModelWorkspace.cancel();

      utils.voices.getVoiceModelWorkspace.setData({ voiceModelId }, (old) => {
        if (!old) return old;
        const newSounds = old?.seedSounds.map((sound) => {
          if (sound.id != seedSoundId) {
            return sound;
          }
          return {
            ...sound,
            active: active,
          };
        });

        return {
          ...old,
          seedSounds: newSounds ?? [],
        };
      });
    },
    onSettled() {
      void utils.voices.getVoiceModelWorkspace.invalidate({ voiceModelId });
    },
    onError(error, variables) {
      toast({
        title: "Sample Update Error",
        description: `Was not able to change ssid: ${variables.seedSoundId} with vmid: ${variables.voiceModelId} to active: ${variables.active}.\nError ${error.message}`,
      });
    },
  });
  const createUploadUrl = api.files.createUploadUrl.useMutation({
    async onSuccess(data) {
      await utils.voices.getVoiceModelWorkspace.cancel();
      utils.voices.getVoiceModelWorkspace.setData({ voiceModelId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          seedSounds: [
            ...(old?.seedSounds ?? []),
            { id: data.fileId, active: data.active },
          ],
        };
      });
    },
  });
  const uploadFile = useMutation({
    async mutationFn({ file, active }: { file: File; active: boolean }) {
      try {
        const { uploadUrl, fileId } = await createUploadUrl.mutateAsync({
          fileName: file.name,
          voiceModelId: voiceModelId,
          active: active,
        });
        await uploadFileFn(file, uploadUrl);
        return { fileId };
      } catch (error) {
        toast({
          title: "Upload Error",
          description: `There was an error uploading: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
    onSettled(data) {
      void utils.voices.getVoiceModelWorkspace.invalidate({ voiceModelId });
      void utils.files.getSeedSound.invalidate({ id: data?.fileId });
    },
  });

  const uploadInProgress = createUploadUrl.isPending || uploadFile.isPending;

  const inactiveSeedSounds = useMemo(
    () => workspace.data?.seedSounds.filter((sound) => !sound.active),
    [workspace.data?.seedSounds],
  );

  const activeSeedSounds = useMemo(
    () => workspace.data?.seedSounds.filter((sound) => sound.active),
    [workspace.data?.seedSounds],
  );

  const numActiveSounds = useMemo(
    () => activeSeedSounds?.length ?? 0,
    [activeSeedSounds?.length],
  );

  const onDropAccepted = useCallback(
    (acceptedFiles: File[]) => {
      let currentActiveSounds = numActiveSounds;
      for (const file of acceptedFiles) {
        const active =
          currentActiveSounds + 1 <=
          env.NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES;

        void uploadFile.mutateAsync({ file: file, active: active });
        currentActiveSounds += 1;
      }
    },
    [numActiveSounds, uploadFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: onDropAccepted,
    accept: { "audio/*": [],},
    maxFiles: 0,
    maxSize: 10000000,
  });

  const [, activeDrop] = useDrop(
    () => ({
      accept: ItemTypes.SOURCE_SOUND,
      drop(item: { seedSoundId: string }) {
        if (
          numActiveSounds + 1 >
          env.NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES
        ) {
          toast({
            title: "Too many active samples",
            description:
              "Deactivate an active sample by dragging it to the inactive box on the left.",
          });
          return;
        }
        updateSeedSound.mutate({
          active: true,
          seedSoundId: item.seedSoundId,
          voiceModelId: voiceModelId,
        });
      },
    }),
    [voiceModelId, updateSeedSound, toast, numActiveSounds],
  );

  const [, inactiveDrop] = useDrop(
    () => ({
      accept: ItemTypes.SOURCE_SOUND,
      drop(item: { seedSoundId: string }) {
        updateSeedSound.mutate({
          active: false,
          seedSoundId: item.seedSoundId,
          voiceModelId: voiceModelId,
        });
      },
    }),
    [voiceModelId, updateSeedSound],
  );

  return (
    <div className="grid h-full grid-cols-3 gap-2 overflow-hidden">
      <div className="col-span-1 flex h-full flex-col space-y-2 overflow-hidden">
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
              <span className="mx-auto select-none text-sm text-slate-500">
                Click or drag audio files to upload.
              </span>
            </div>
          )}
          {uploadInProgress && <p>Uploading...</p>}
        </div>
        <div
          ref={inactiveDrop}
          className="flex flex-1 flex-col space-y-2 overflow-y-auto rounded-md border p-2"
        >
          {inactiveSeedSounds != null && inactiveSeedSounds.length > 0 ? (
            inactiveSeedSounds.map((sound) => (
              <SeedSoundDisplay
                key={sound.id}
                seedSoundId={sound.id}
                voiceModelId={voiceModelId}
              />
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-slate-500">
              Drag samples here to stop them from being used during generation.
            </div>
          )}
        </div>
      </div>
      <div className="col-span-2 flex h-full flex-col space-y-2 overflow-hidden">
        <div ref={activeDrop} className="relative h-full rounded-md border p-2">
          <div className="grid grid-cols-3 gap-2">
            {activeSeedSounds &&
              activeSeedSounds.map((sound) => (
                <SeedSoundDisplay
                  className="z-10"
                  key={sound.id}
                  seedSoundId={sound.id}
                  voiceModelId={voiceModelId}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeedSoundUploader;
