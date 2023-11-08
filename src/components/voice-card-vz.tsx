import {
  Bookmark,
  GitFork,
  MoreHorizontal,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { api, type VoiceListElement } from "~/utils/api";
import { cn } from "~/utils/ui";
import { PlayButton } from "./play-button";

type Props = {
  voice: VoiceListElement;
  className?: string;
};
// TODO: make optimistic like update and add stable ordering to frontend by caching ids then resorting from server using rq select
const VoiceCardVZ: React.FC<Props> = ({ className, voice }) => {
  // const utils = api.useUtils();
  const rateVoice = api.voices.rateVoice.useMutation({
    // onMutate: async ({ voiceId, action }) => {
    //   await utils.voices.listVoices.cancel();

    //   utils.voices.listVoices.setData((old) => {
    //     const newVoices = old?.map((voice) => {
    //       if (voice.id != voiceId) {
    //         return voice;
    //       }
    //       const voteChange = action === "upvote" ? 1 : -1;
    //       return {
    //         ...voice,
    //         score: voice.score + voteChange,
    //       };
    //     });

    //     return newVoices ?? [];
    //   });
    // },
    // onError: (error, variables, context) => {
    //   utils.voices.listVoices.setData(context?.oldVoices);
    // },
    // onSettled: () => {
    //   void utils.voices.listVoices.invalidate();
    // },



  });

  const isUpvoted = voice.votes?.[0]?.type == "UPVOTE";
  const isDownvoted = voice.votes?.[0]?.type == "DOWNVOTE";

  const onUpvote = () => {
    rateVoice.mutate({
      voiceId: voice.id,
      action: "upvote",
    });
  };

  const onDownvote = () => {
    rateVoice.mutate({
      voiceId: voice.id,
      action: "downvote",
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-lg border border-gray-200 hover:border-indigo-500 dark:bg-gray-800",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between p-6">
        <div className="flex w-full items-start justify-between overflow-hidden">
          <div className="flex-grow overflow-hidden">
            <Link href={`/voices/${voice.id}`}>
              <h3 className="truncate text-2xl font-semibold text-gray-800 hover:underline dark:text-white">
                {voice.name}
              </h3>
            </Link>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
              by Author&apos;s Name
            </p>

            {voice.uniqueWarcraftNpc && (
              <Link href={`/npcs/${voice.uniqueWarcraftNpc?.id}`}>
                <p className="mt-1 text-sm text-gray-500 hover:underline dark:text-gray-300">
                  NPC: {voice.uniqueWarcraftNpc.name}
                </p>
              </Link>
            )}
          </div>
          <Button
            className="rounded-md bg-transparent px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            variant="ghost"
          >
            <Bookmark className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {voice.modelVersions[0]?.previewSounds
              .slice(0, 1)
              .map((sound) => <PlayButton key={sound.id} sound={sound} />)}

            <Button
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              variant="outline"
              onClick={onUpvote}
            >
              <ThumbsUp
                className={cn(
                  "h-5 w-5",
                  isUpvoted ? "text-green-500" : "text-gray-500"
                )}
              />
            </Button>

            <Button
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              variant="outline"
              onClick={onDownvote}
            >
                 <ThumbsDown
                className={cn(
                  "h-5 w-5",
                  isDownvoted ? "text-red-500" : "text-gray-500"
                )}
              />
            </Button>
            <p className="rounded-md bg-gray-100 px-3 py-2 text-center text-gray-500 dark:text-gray-300">
              {voice.score}
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="rounded-md bg-transparent px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                variant="ghost"
              >
                <MoreHorizontal className="h-5 w-5 text-gray-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="w-full space-y-2">
                {/* <Button
                  className="flex w-full items-center justify-start rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  variant="outline"
                >
                  <Bookmark className="mr-2 h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-300">
                    Bookmark
                  </span>
                </Button> */}
                <Button
                  className="flex w-full items-center justify-start rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  variant="outline"
                >
                  <GitFork className="mr-2 h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-300">
                    Fork
                  </span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default VoiceCardVZ;
