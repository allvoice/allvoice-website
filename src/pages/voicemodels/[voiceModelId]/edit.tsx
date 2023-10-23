import { zodResolver } from "@hookform/resolvers/zod";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import { InfoPopover } from "~/components/info-popover";
import LeftSidebarLayout from "~/components/left-sidebar-layout";
import SeedSoundUploader from "~/components/seed-sound-uploader";
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
import { Textarea } from "~/components/ui/textarea";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/utils/api";
import { voiceEditFormSchema } from "~/utils/schema";

const VoiceEdit: NextPage = () => {
  const router = useRouter();
  // validate this better later, possibly serverside before rendering the page
  const voiceModelId = (router.query.voiceModelId ?? "") as string;

  const generateTestSound = api.voices.generateTestSound.useMutation();
  const updateVoiceGenerationSettings =
    api.voices.updateVoiceGenerationSettings.useMutation();

  const form = useForm<z.infer<typeof voiceEditFormSchema>>({
    resolver: zodResolver(voiceEditFormSchema),
    // TODO: get defaults from workspace config
    defaultValues: {
      similarity: 0.98,
      stability: 0.3,
      style: 0,
      speakerBoost: true,
      modelName: "eleven_english_v2",
    },
  });
  const selectedModelName = form.watch("modelName");

  const [testGeneratedSoundUrl, setTestGeneratedSoundUrl] = useState<
    string | undefined
  >();
  const { toast } = useToast();
  const handleGenerate = form.handleSubmit(
    async (data) => {
      console.log("submitting");
      toast({
        title: "You submitted the following values:",
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">
              {JSON.stringify({ voiceModelId, formData: data }, null, 2)}
            </code>
          </pre>
        ),
      });
      const url = await generateTestSound.mutateAsync({
        voiceModelId,
        formData: data,
      });
      setTestGeneratedSoundUrl(url);
    },
    (errors) => {
      console.log(errors);
    }
  );

  const handlePost = form.handleSubmit(async (data) => {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">
            {JSON.stringify({ voiceModelId, formData: data }, null, 2)}
          </code>
        </pre>
      ),
    });
    await updateVoiceGenerationSettings.mutateAsync({
      voiceModelId,
      formData: data,
    });
    await router.push(`/voicemodels/${voiceModelId}/post`);
  });

  return (
    <LeftSidebarLayout
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

            <FormField
              control={form.control}
              name="generationText"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <FormLabel>Test Generation Text</FormLabel>

                    <InfoPopover>
                      <p className="text-sm">
                        Your model will read the text in this field to help you
                        judge its quality.
                      </p>
                    </InfoPopover>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="All members of the horde are equal in my eyes."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
          <div className="flex space-x-2">
            <Button type="button" onClick={handleGenerate}>
              Generate
            </Button>
            {testGeneratedSoundUrl && (
              <audio src={testGeneratedSoundUrl} controls />
            )}

            <Button type="button" onClick={handlePost}>
              Post
            </Button>
          </div>
        </Form>
      }
    >
      <div className="flex items-center space-x-1">
        <Label>Samples</Label>
        <InfoPopover>
          <p className="text-sm">
            Use the top left box to add mp3 or ogg files. The files on the left
            will not be used during generation. The files on the right are being
            actively used.
          </p>
        </InfoPopover>
      </div>
      <SeedSoundUploader voiceModelId={voiceModelId} />
    </LeftSidebarLayout>
  );
};

export default VoiceEdit;
