import { type NextPage } from "next";
import MainLayout from "~/components/main-layout";
import VoiceCard from "~/components/voice-card";

import { api } from "~/utils/api";
const Home: NextPage = () => {
  const voiceQuery = api.voices.listNewest.useQuery();
  const likedSounds = api.users.listLikedSounds.useQuery();

  return (
    <MainLayout>
      <ul
        role="list"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {voiceQuery.data?.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            initiallyLiked={likedSounds.data?.has(voice.id)}
          />
        ))}
      </ul>
    </MainLayout>
  );
};

export default Home;
