import { type NextPage } from "next";
import { api } from "~/utils/api";
const Home: NextPage = () => {

  const exp = api.example.hello.useQuery({text: "test"})

  return (
    <div className="h-screen bg-red-500">
      <p>Hello! Testing the layout.</p>
    </div>
  );
};

export default Home;
