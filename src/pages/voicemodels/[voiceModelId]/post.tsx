import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import MainLayout from "~/components/main-layout";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandLoading,
} from "~/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/utils/api";
import { cn } from "~/utils/ui";

export const voicePostFormSchema = z.object({
  warcraftNpcDisplayId: z.string(),
  voiceTitle: z.string(),
});

const VoiceEdit: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();

  // validate this better later, possibly serverside before rendering the page
  const voiceModelId = (router.query.voiceModelId ?? "") as string;
  const postVoice = api.voices.postVoiceModel.useMutation();

  const allWarcraftVoiceNameOptions =
    api.warcraft.getAllWarcraftVoiceNameOptions.useQuery();

  const form = useForm<z.infer<typeof voicePostFormSchema>>({
    resolver: zodResolver(voicePostFormSchema),
    // TODO: get defaults from workspace config
    defaultValues: {
      voiceTitle: "",
      warcraftNpcDisplayId: "",
    },
  });
  const onSubmit = async (data: z.infer<typeof voicePostFormSchema>) => {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">
            {JSON.stringify(
              {
                voiceModelId: voiceModelId,
                voiceTitle: data.voiceTitle,
                warcraftVoiceName: data.warcraftNpcDisplayId,
              },
              null,
              2
            )}
          </code>
        </pre>
      ),
    });

    const url = await postVoice.mutateAsync({
      voiceModelId: voiceModelId,
      voiceTitle: data.voiceTitle,
      warcraftNpcDisplayId: data.warcraftNpcDisplayId,
    });

    await router.push(url);
  };

  return (
    <MainLayout>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="voiceTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Untitled Voice" {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="warcraftNpcDisplayId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Warcraft Voice Name</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? allWarcraftVoiceNameOptions.data?.find(
                              (option) => option.value === field.value
                            )?.label
                          : "Select a voice (e.g. HumanMale)"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="h-[500px] w-full p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search..." />
                      <CommandEmpty>No voice found.</CommandEmpty>
                      {allWarcraftVoiceNameOptions.isLoading && (
                        <CommandLoading>Fetching voices…</CommandLoading>
                      )}
                      <CommandGroup className="overflow-auto">
                        {allWarcraftVoiceNameOptions.data?.map((option) => (
                          <CommandItem
                            value={option.label}
                            key={option.value}
                            onSelect={() => {
                              form.setValue(
                                "warcraftNpcDisplayId",
                                option.value
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                option.value === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {`${option.label} (${option.npcsCount})`}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Name of the in game voice this AI voice will be used for. The
                  number in () represents the number of in-game NPCs this voice
                  is linked to that have spoken text.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Post</Button>
        </form>
      </Form>
    </MainLayout>
  );
};

export default VoiceEdit;
