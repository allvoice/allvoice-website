import { type NextPage } from "next";

import Header from "~/components/header";

const Home: NextPage = () => {

  return (
    <div className="min-h-full">
    <Header />

    <main className="h-[calc(100vh-theme('spacing.16'))]">
      <div className="mx-auto flex max-w-7xl flex-col space-y-4 px-2 py-2 sm:px-6 md:py-10 lg:px-8">
     
      </div>
    </main>
  </div>
  );
};

export default Home;
