import { Button } from "~/components/ui/button";
import {
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
import { api, type VoiceListElement, type VoiceListInput } from "~/utils/api";

import Link from "next/link";
import { PlayButton } from "./play-button";
import { VoteType, type Vote, type Favorite } from "@prisma/client";
import { cn } from "~/utils/ui";

type Props = {
  voice: VoiceListElement;
  // needed for optimisitic update for now until we dont need to provide an exact match for the query we're setting data for
  voiceListInput: VoiceListInput;
  className?: string;
};

const VoiceCardVZ: React.FC<Props> = ({ className, voice, voiceListInput }) => {
  const utils = api.useUtils();
  const isBookmarked = voice.favorites?.[0] != null;
  const currVote = voice.votes?.[0];
  const isUpvoted = currVote?.type == VoteType.UPVOTE;
  const isDownvoted = currVote?.type == VoteType.DOWNVOTE;

  const rateVoice = api.voices.rateVoice.useMutation({
    onMutate: async ({ voiceId, action }) => {
      await utils.voices.listVoices.cancel();

      utils.voices.listVoices.setData(voiceListInput, (old) => {
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

  const bookmarkVoice = api.voices.bookmarkVoice.useMutation({
    onMutate: async ({ voiceId }) => {
      await utils.voices.listVoices.cancel();

      utils.voices.listVoices.setData(voiceListInput, (old) => {
        const newVoices = old?.map((voice) => {
          if (voice.id != voiceId) {
            return voice;
          }
          if (isBookmarked) {
            return {
              ...voice,
              favorites: [],
            };
          }
          return {
            ...voice,
            favorites: [{} as Favorite],
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

  const onBookmark = () => {
    bookmarkVoice.mutate({
      voiceId: voice.id,
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-lg border hover:border-indigo-500 dark:bg-gray-800",
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
              by {voice.ownerUser.username ?? "unknown"}
            </p>

            {voice.uniqueWarcraftNpc && (
              <Link href={`/npcs/${voice.uniqueWarcraftNpc?.id}`}>
                <p className="mt-1 text-sm text-gray-500 hover:underline dark:text-gray-300">
                  NPC: {voice.uniqueWarcraftNpc.name}
                </p>
              </Link>
            )}

            {voice.warcraftNpcDisplay && (
              <Link href={`/charactermodels/${voice.warcraftNpcDisplay?.id}`}>
                <p className="mt-1 text-sm text-gray-500 hover:underline dark:text-gray-300">
                  Model: {voice.warcraftNpcDisplay.voiceName}
                </p>
              </Link>
            )}
          </div>
          <Button
            className="rounded-md bg-transparent px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            variant="ghost"
            onClick={onBookmark}
            disabled={bookmarkVoice.isPending}
          >
            <Bookmark
              className={cn(
                "h-5 w-5 text-gray-500",
                isBookmarked ? "fill-gray-500" : "",
              )}
            />
          </Button>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {voice.modelVersions[0]?.previewSounds
              .slice(0, 1)
              .map((sound) => (
                <PlayButton key={sound.id} soundUrl={sound.publicUrl} />
              ))}

            <Button
              className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              variant="ghost"
              onClick={onUpvote}
              disabled={rateVoice.isPending}
            >
              <ThumbsUp
                className={cn(
                  "h-5 w-5",
                  isUpvoted ? "text-green-500" : "text-gray-500",
                )}
              />
            </Button>

            <Button
              className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              variant="ghost"
              onClick={onDownvote}
              disabled={rateVoice.isPending}
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
                <Link href={`/voicemodels/create?fork=${voice.id}`}>
                  <Button
                    className="flex w-full items-center justify-start rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    variant="outline"
                  >
                    <GitFork className="mr-2 h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-300">
                      Fork
                    </span>
                  </Button>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default VoiceCardVZ;
