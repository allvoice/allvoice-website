import { zodResolver } from "@hookform/resolvers/zod";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "~/utils/ui";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandLoading,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";
import { useToast } from "~/components/ui/use-toast";

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
                        "w-[200px] justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? allWarcraftVoiceNameOptions.data?.find(
                            (option) => option.value === field.value
                          )?.label
                        : "Select a voice"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandEmpty>No voice found.</CommandEmpty>
                    {allWarcraftVoiceNameOptions.isLoading && (
                      <CommandLoading>Fetching voices…</CommandLoading>
                    )}
                    <CommandGroup>
                      {allWarcraftVoiceNameOptions.data?.map((option) => (
                        <CommandItem
                          value={option.value}
                          key={option.value}
                          onSelect={(value) => {
                            form.setValue("warcraftNpcDisplayId", value);
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
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Name of the in game voice this AI voice will be used for.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Post</Button>
      </form>
    </Form>
  );
};

export default VoiceEdit;
