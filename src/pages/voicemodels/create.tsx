import { getAuth } from "@clerk/nextjs/server";
import { type NextPage, type GetServerSideProps } from "next";
import Error from "next/error";
import { prisma } from "~/server/db";
import { type Prisma } from "@prisma/client";

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

  const voiceData: Prisma.VoiceCreateInput = {
    ownerUser: {
      connectOrCreate: {
        where: { id: userId },
        create: { id: userId },
      },
    },
  };

  if (uniqueNPCId) {
    voiceData.uniqueWarcraftNpc = {
      connect: {
        id: uniqueNPCId,
      },
    };
  }

  if (characterModelId) {
    voiceData.warcraftNpcDisplay = {
      connect: {
        id: characterModelId,
      },
    };
  }

  const voiceModel = await prisma.voiceModel.create({
    data: {
      voice: { create: voiceData },
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
