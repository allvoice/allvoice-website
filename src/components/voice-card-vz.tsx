import { Button } from "~/components/ui/button";
import {
  Play,
  Pause,
  ThumbsUp,
  ThumbsDown,
  GitFork,
  MoreHorizontal,
  Bookmark,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { type VoiceListElement } from "~/utils/api";
import Link from "next/link";
import { PlayButton } from "./play-button";
import { VoteType, type Vote } from "@prisma/client";

type Props = {
  voice: VoiceListElement;
  className?: string;
};


const VoiceCardVZ: React.FC<Props> = ({ className, voice }) => {
  const utils = api.useUtils();
  const currVote = voice.votes?.[0];
  const isUpvoted = currVote?.type == VoteType.UPVOTE;
  const isDownvoted = currVote?.type == VoteType.DOWNVOTE;

  const rateVoice = api.voices.rateVoice.useMutation({
    onMutate: async ({ voiceId, action }) => {
      await utils.voices.listVoices.cancel();

      utils.voices.listVoices.setData(undefined, (old) => {
        const newVoices = old?.map((voice) => {
          if (voice.id != voiceId) {
            return voice;
          }
          let newScore = voice.score;
          let newVotes = voice.votes;
          if (action === "upvote") {
            if (isUpvoted) {
              newScore = voice.score - 1;
              newVotes = [];
            } else {
              newScore = isDownvoted ? voice.score + 2 : voice.score + 1;
              newVotes = [{ ...currVote, type: VoteType.UPVOTE } as Vote];
            }
          } else if (action === "downvote") {
            if (isDownvoted) {
              newScore = voice.score + 1;
              newVotes = [];
            } else {
              newScore = isUpvoted ? voice.score - 2 : voice.score - 1;
              newVotes = [{ ...currVote, type: VoteType.DOWNVOTE } as Vote];
            }
          }
          return {
            ...voice,
            score: newScore,
            votes: newVotes,
          };
        });

        return newVoices ?? [];
      });
    },
    onSettled: () => {
      void utils.voices.listVoices.invalidate();
    },
  });

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
              <h3 className="truncate text-2xl font-semibold text-gray-800 dark:text-white hover:underline">
                {voice.name}
              </h3>
            </Link>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
              by Author's Name
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
            >
              <ThumbsUp
                className={cn(
                  "h-5 w-5",
                  isUpvoted ? "text-green-500" : "text-gray-500",
                )}
              />
            </Button>

            <Button
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              variant="outline"
            >
              <ThumbsDown
                className={cn(
                  "h-5 w-5",
                  isDownvoted ? "text-red-500" : "text-gray-500",
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
