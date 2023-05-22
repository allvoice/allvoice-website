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

  const voice = await prisma.voice.create({
    data: {
      ownerUser: {
        connectOrCreate: {
          where: { id: userId },
          create: { id: userId },
        },
      },
    },
  });

  const voiceModel = await prisma.voiceModel.create({
    data: {
      voice: { connect: { id: voice.id } },
    },
  });

  const redirectUrl = `/voices/${voiceModel.id}/edit`

  return {
    redirect: {
      destination: redirectUrl,
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
