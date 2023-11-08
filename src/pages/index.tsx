import { type NextPage } from "next";
import { useState } from "react";
import MainLayout from "~/components/main-layout";
import VoiceCard from "~/components/voice-card";
import VoiceCardVZ from "~/components/voice-card-vz";

import { api } from "~/utils/api";
const Home: NextPage = () => {
  const [initialOrder, setInitialOrder] = useState<string[]>([]);
  const voiceQuery = api.voices.listVoices.useQuery(undefined,
    {
      select(data) {
        if (initialOrder.length === 0) {
          setInitialOrder(data.map((voice) => voice.id));
        }

        if (initialOrder.length > 0) {
          return [...data].sort(
            (a, b) => {
              const aIndex = initialOrder.indexOf(a.id);
              const bIndex = initialOrder.indexOf(b.id);
              if (aIndex === -1) {
                initialOrder.push(a.id);
              }
              if (bIndex === -1) {
                initialOrder.push(b.id);
              }
              return aIndex - bIndex;
            }
          );
        }
      },
    },
  );

  return (
    <MainLayout>
      <ul
        role="list"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {voiceQuery.data?.map((voice) => (
          <VoiceCardVZ key={voice.id} voice={voice} />
        ))}
        {voiceQuery.data?.map((voice) => (
          <VoiceCard key={voice.id} voice={voice} />
        ))}
      </ul>
    </MainLayout>
  );
};

export default Home;
