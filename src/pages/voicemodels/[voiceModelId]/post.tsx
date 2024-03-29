import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { AlertCircle } from "lucide-react";
import { type GetServerSideProps, type NextPage } from "next";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import superjson from "superjson";
import { z } from "zod";
import MainLayout from "~/components/main-layout";
import SetUsernameDialog from "~/components/set-username-dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button, LoadingButton } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { appRouter } from "~/server/api/root";
import { createTRPCSSRContext } from "~/server/api/trpc";
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

  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: createTRPCSSRContext(context.req),
    transformer: superjson,
  });
  await helpers.users.getUserDetails.prefetch();

  return {
    props: {
      voiceModelId: voiceModelId.data,
      trpcState: helpers.dehydrate(),
    },
  };
};

const VoicePost: NextPage<ServerProps> = ({ voiceModelId }) => {
  const router = useRouter();

  const user = useUser();
  const postVoice = api.voices.postVoiceModel.useMutation({
    onSuccess: async (respUrl) => {
      await router.push(respUrl);
    },
  });
  const isUsernameSet = !!user.user?.username;
  const isPostable = !postVoice.isPending && isUsernameSet;

  const form = useForm<z.infer<typeof voicePostFormSchema>>({
    resolver: zodResolver(voicePostFormSchema),
    defaultValues: {
      voiceTitle: "",
    },
  });
  const onSubmit = (data: z.infer<typeof voicePostFormSchema>) => {
    if (!isPostable) return;
    postVoice.mutate({
      voiceModelId: voiceModelId,
      voiceTitle: data.voiceTitle,
    });
  };

  return (
    <MainLayout>
      {!isUsernameSet && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2">
              You don&apos;t have a username. Set one before posting.
            </p>
            <SetUsernameDialog
              triggerContent={
                <Button variant="outline" className="text-black">
                  Set Username
                </Button>
              }
            />
          </AlertDescription>
        </Alert>
      )}
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

          <LoadingButton
            loading={postVoice.isPending}
            disabled={!isPostable}
            disabledStyle={!isPostable}
            type="submit"
          >
            Post
          </LoadingButton>
        </form>
      </Form>
    </MainLayout>
  );
};

export default VoicePost;
