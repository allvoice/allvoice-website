import { zodResolver } from "@hookform/resolvers/zod";
import { GetServerSideProps, type NextPage } from "next";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import MainLayout from "~/components/main-layout";
import SetUsernameDialog from "~/components/set-username-dialog";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";

const voicePostFormSchema = z.object({
  voiceTitle: z.string(),
});

type ServerProps = {
  voiceModelId: string;
};

export const getServerSideProps: GetServerSideProps<ServerProps> = async (
  context,
  // eslint-disable-next-line @typescript-eslint/require-await
) => {
  const voiceModelId = z
    .string()
    .uuid()
    .safeParse(context.params?.voiceModelId);
  if (!voiceModelId.success) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      voiceModelId: voiceModelId.data,
    },
  };
};

const VoicePost: NextPage<ServerProps> = ({ voiceModelId }) => {
  const router = useRouter();

  const postVoice = api.voices.postVoiceModel.useMutation();

  const form = useForm<z.infer<typeof voicePostFormSchema>>({
    resolver: zodResolver(voicePostFormSchema),
    defaultValues: {
      voiceTitle: "",
    },
  });
  const onSubmit = async (data: z.infer<typeof voicePostFormSchema>) => {
    const url = await postVoice.mutateAsync({
      voiceModelId: voiceModelId,
      voiceTitle: data.voiceTitle,
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

          <Button type="submit">Post</Button>
        </form>
      </Form>
      <SetUsernameDialog />
    </MainLayout>
  );
};

export default VoicePost;
