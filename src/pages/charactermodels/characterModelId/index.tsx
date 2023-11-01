import { type NextPage } from "next";
import { useRouter } from "next/router";
import MainLayout from "~/components/main-layout";

const CharacterModelPage: NextPage = () => {
  const router = useRouter();
  const characterModelId = (router.query.characterModelId ?? "") as string;

  return <MainLayout>{characterModelId}</MainLayout>;
};

export default CharacterModelPage;
