import { getAuth } from "@clerk/nextjs/server";
import { type NextPage, type GetServerSideProps } from "next";
import Error from "next/error";
import { prisma } from "~/server/db";

type Props = {
  statusCode?: number;
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { userId } = getAuth(ctx.req);
  if (!userId) {
    return {
      props: {
        statusCode: 403,
      },
    };
  }

  const uniqueNPCId = ctx.query.uniqueNPCId as string | undefined;
  const characterModelId = ctx.query.characterModelId as string | undefined;
  const forkVoiceId = ctx.query.fork as string | undefined;

  if (forkVoiceId) {
    const voiceToBeForked = await prisma.voice.findUniqueOrThrow({
      where: {
        id: forkVoiceId,
      },
    });

    const newVoice = await prisma.voice.create({
      data: {
        ownerUser: {
          connectOrCreate: { where: { id: userId }, create: { id: userId } },
        },
        forkParent: { connect: { id: voiceToBeForked.id } },
        ...(voiceToBeForked.uniqueWarcraftNpcId
          ? {
              uniqueWarcraftNpc: {
                connect: { id: voiceToBeForked.uniqueWarcraftNpcId },
              },
            }
          : {}),
        ...(voiceToBeForked.warcraftNpcDisplayId
          ? {
              warcraftNpcDisplay: {
                connect: { id: voiceToBeForked.warcraftNpcDisplayId },
              },
            }
          : {}),
      },
    });

    const voiceModels = await prisma.voiceModel.findMany({
      where: {
        voiceId: forkVoiceId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1,
      include: {
        soundFileJoins: true,
      },
    });

    const voiceModel = voiceModels[0];
    if (!voiceModel) {
      return {
        props: {
          statusCode: 500,
        },
      };
    }

    const newVoiceModel = await prisma.voiceModel.create({
      data: {
        voice: { connect: { id: newVoice.id } },
        forkParent: { connect: { id: voiceModel.id } },
        elevenLabsModelId: voiceModel.elevenLabsModelId,
        elevenLabsStability: voiceModel.elevenLabsStability,
        elevenLabsSimilarityBoost: voiceModel.elevenLabsSimilarityBoost,
        elevenLabsStyle: voiceModel.elevenLabsStyle,
        elevenLabsSpeakerBoost: voiceModel.elevenLabsSpeakerBoost,
        published: false,
      },
    });

    for (const seedSoundJoin of voiceModel.soundFileJoins) {
      await prisma.voiceModelSeedSounds.create({
        data: {
          voiceModel: { connect: { id: newVoiceModel.id } },
          seedSound: { connect: { id: seedSoundJoin.seedSoundId } },
          active: seedSoundJoin.active,
        },
      });
    }

    return {
      redirect: {
        destination: `/voicemodels/${newVoiceModel.id}/edit`,
        permanent: false,
      },
    };
  }

  const voiceModel = await prisma.voiceModel.create({
    data: {
      voice: {
        create: {
          ownerUser: {
            connectOrCreate: {
              where: { id: userId },
              create: { id: userId },
            },
          },
          uniqueWarcraftNpc: uniqueNPCId
            ? {
                connect: {
                  id: uniqueNPCId,
                },
              }
            : {},
          warcraftNpcDisplay: characterModelId
            ? {
                connect: {
                  id: characterModelId,
                },
              }
            : {},
        },
      },
    },
  });

  return {
    redirect: {
      destination: `/voicemodels/${voiceModel.id}/edit`,
      permanent: false,
    },
  };
};

const CreatePage: NextPage<Props> = ({ statusCode }) => {
  if (statusCode) {
    return <Error statusCode={statusCode} />;
  }
  return <div>Failed to create new voice</div>;
};
export default CreatePage;
