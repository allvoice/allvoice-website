import { type NextPage } from "next";
import VoiceCard from "~/components/VoiceCard";

import { api } from "~/utils/api";
const Home: NextPage = () => {
  // api.example.hello.useQuery({ text: "test" });
  const voiceQuery = api.voice.listNewest.useQuery();
  // const mockQuery = api.voice.refreshMock.useQuery();


  return (
    <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {voiceQuery.data?.map(voice => <VoiceCard voice={voice} />)}
    </ul>
  );
};

export default Home;
