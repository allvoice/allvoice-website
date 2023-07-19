import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import MainLayout from "~/components/main-layout";
import { Toaster } from "~/components/ui/toaster";
import { Compose } from "~/utils/compose";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ClerkProvider {...pageProps}>
      <Compose
        // global providers go here
        components={[]}
      >
        <MainLayout>
          <Component {...pageProps} />
        </MainLayout>
        <Toaster />
      </Compose>
    </ClerkProvider>
  );
};

export default api.withTRPC(MyApp);
