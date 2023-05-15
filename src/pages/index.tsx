import { type NextPage } from "next";
import SoundCard from "~/components/SoundCard";

import { api } from "~/utils/api";
const Home: NextPage = () => {
  api.example.hello.useQuery({ text: "test" });

  return (
    <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <SoundCard />
      <SoundCard />
      <SoundCard />
      <SoundCard />
      <SoundCard />
    </ul>
  );
};

export default Home;
