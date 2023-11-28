import { zodResolver } from "@hookform/resolvers/zod";
import { throttle } from "lodash";
import { type GetServerSideProps, type NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { type DeepPartial, useForm } from "react-hook-form";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { z } from "zod";
import { InfoPopover } from "~/components/info-popover";
import { PlayButton } from "~/components/play-button";
import SeedSoundUploader from "~/components/seed-sound-uploader";
import SidebarLayout from "~/components/sidebar-layout";
import ThreeDotsFade from "~/components/spinner";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { prisma } from "~/server/db";
import { api } from "~/utils/api";
import { voiceEditFormSchema } from "~/utils/schema";

type ServerProps = {
  voiceModelId: string;
  similarity: number;
  stability: number;
  style: number;
  speakerBoost: boolean;
  modelName: string;
};

export const getServerSideProps: GetServerSideProps<ServerProps> = async (
  ctx,
) => {
  const voiceModelId = z
    .string()
    .uuid()
    .safeParse(ctx.query?.voiceModelId);
  if (!voiceModelId.success) {
    return {
      notFound: true,
    };
  }

  const voiceModel = await prisma.voiceModel.findUnique({
    where: { id: voiceModelId.data },
    select: {
      elevenLabsModelId: true,
      elevenLabsSimilarityBoost: true,
      elevenLabsStyle: true,
      elevenLabsSpeakerBoost: true,
      elevenLabsStability: true,
      published: true,
      voiceId: true,
    },
  });

  if (!voiceModel) {
    return {
      notFound: true,
    };
  }

  if (voiceModel.published) {
    return {
      redirect: {
        destination: `/voices/${voiceModel.voiceId}`,
        permanent: true,
      },
    };
  }

  return {
    props: {
      voiceModelId: voiceModelId.data,
      modelName: voiceModel.elevenLabsModelId,
      similarity: voiceModel.elevenLabsSimilarityBoost,
      stability: voiceModel.elevenLabsStability,
      style: voiceModel.elevenLabsStyle,
      speakerBoost: voiceModel.elevenLabsSpeakerBoost,
    },
  };
};

const VoiceEdit: NextPage<ServerProps> = (serverProps) => {
  const router = useRouter();
  const voiceModelId = serverProps.voiceModelId;
  const utils = api.useUtils();

  const generateTestSound = api.voices.generateTestSound.useMutation({
    onSettled() {
      void utils.users.getUserDetails.invalidate(undefined);
    },
  });
  const updateVoiceGenerationSettings =
    api.voices.updateVoiceGenerationSettings.useMutation();
  const { load } = useGlobalAudioPlayer();

  const form = useForm<z.infer<typeof voiceEditFormSchema>>({
    resolver: zodResolver(voiceEditFormSchema),
    defaultValues: {
      similarity: serverProps.similarity,
      stability: serverProps.stability,
      style: serverProps.style,
      speakerBoost: serverProps.speakerBoost,
      modelName: serverProps.modelName,
    },
  });

  const selectedModelName = form.watch("modelName");

  const [testGeneratedSoundUrl, setTestGeneratedSoundUrl] = useState<
    string | undefined
  >();
  const handleGenerate = form.handleSubmit(async (data) => {
    setTestGeneratedSoundUrl(undefined);
    const url = await generateTestSound.mutateAsync({
      voiceModelId,
      formData: data,
    });
    load(url, { autoplay: true, html5: true, format: "mp3" });
    setTestGeneratedSoundUrl(url);
  });

  const handlePost = form.handleSubmit(async () => {
    await router.push(`/voicemodels/${voiceModelId}/post`);
  });

  useEffect(() => {
    const throttledCb = throttle(
      (data: DeepPartial<z.infer<typeof voiceEditFormSchema>>) => {
        updateVoiceGenerationSettings.mutate({
          voiceModelId: voiceModelId,
          formData: data,
        });
      },
      1000,
    );

    const subscription = form.watch((value) => throttledCb(value));

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch, updateVoiceGenerationSettings.mutate, voiceModelId]);

  return (
    <SidebarLayout
      sidebarChildren={
        <Form {...form}>
          <form className="space-y-8">
            <FormField
              control={form.control}
              name="modelName"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <FormLabel>Model</FormLabel>
                    <InfoPopover>
                      <p className="text-sm">
                        English was trained on American and British audiobooks.
                        Multilingual is capable of more accents with varying
                        quality.
                      </p>
                    </InfoPopover>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="eleven_english_v2">
                        Eleven English v2
                      </SelectItem>
                      <SelectItem value="eleven_multilingual_v2">
                        Eleven Multilingual v2
                      </SelectItem>
                      <SelectItem value="eleven_monolingual_v1">
                        Eleven English v1
                      </SelectItem>
                      <SelectItem value="eleven_multilingual_v1">
                        Eleven Multilingual v1
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="similarity"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <FormLabel>Similarity</FormLabel>
                    <InfoPopover>
                      <p className="text-sm">
                        High similarity boosts overall voice clarity and target
                        speaker similarity. Very high values can cause
                        artifacts, so adjusting this setting to find the optimal
                        value is encouraged.
                      </p>
                    </InfoPopover>
                  </div>
                  <FormControl>
                    <Slider
                      {...field}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      max={1}
                      step={0.002}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stability"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <FormLabel>Stability</FormLabel>
                    <InfoPopover>
                      <p className="text-sm">
                        Decreasing stability can make speech more expressive
                        with output varying between re-generations. It can also
                        lead to instabilities.
                      </p>
                    </InfoPopover>
                  </div>
                  <FormControl>
                    <Slider
                      {...field}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      max={1}
                      step={0.002}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="style"
              render={({ field }) => (
                <FormItem
                  hidden={
                    selectedModelName == "eleven_monolingual_v1" ||
                    selectedModelName == "eleven_multilingual_v1"
                  }
                >
                  <div className="flex items-center space-x-1">
                    <FormLabel>Style Exaggeration</FormLabel>
                    <InfoPopover>
                      <p className="text-sm">
                        High values are recommended if the style of the speech
                        should be exaggerated compared to the uploaded audio.
                        Higher values can lead to more instability in the
                        generated speech.
                      </p>
                    </InfoPopover>
                  </div>
                  <FormControl>
                    <Slider
                      {...field}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      max={1}
                      step={0.002}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="speakerBoost"
              render={({ field }) => (
                <FormItem
                  hidden={
                    selectedModelName == "eleven_monolingual_v1" ||
                    selectedModelName == "eleven_multilingual_v1"
                  }
                >
                  <FormControl>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-1">
                        <FormLabel>Speaker Boost</FormLabel>
                        <InfoPopover>
                          <p className="text-sm">
                            Boost the similarity of the synthesized speech and
                            the voice at the cost of some generation speed.
                          </p>
                        </InfoPopover>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <p className="text-sm">Enabled</p>
                      </div>
                    </div>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
          <div className="flex flex-1 flex-col justify-end space-y-2">
            <div className="flex space-x-1">
              <Button
                className="flex-grow"
                type="button"
                onClick={handleGenerate}
                disabled={generateTestSound.isPending}
              >
                {generateTestSound.isPending ? (
                  <ThreeDotsFade className="w-5 fill-white" />
                ) : (
                  "Generate"
                )}
              </Button>
              {testGeneratedSoundUrl && (
                <div>
                  <PlayButton soundUrl={testGeneratedSoundUrl} dark={true} />
                </div>
              )}
            </div>
            <Button
              className="w-full"
              type="button"
              onClick={handlePost}
              disabled={generateTestSound.isPending}
            >
              Post
            </Button>
          </div>
        </Form>
      }
    >
      <div className=" flex h-full flex-col space-y-1 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1">
          <Label>Samples</Label>
          <InfoPopover>
            <p className="text-sm">
              Use the top left box to add mp3 or ogg files. The files on the
              left will not be used during generation. The files on the right
              are being actively used.
            </p>
          </InfoPopover>
        </div>
        <SeedSoundUploader voiceModelId={voiceModelId} />
      </div>
    </SidebarLayout>
  );
};

export default VoiceEdit;
