import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import MainLayout from "~/components/main-layout";
import { Toaster } from "~/components/ui/toaster";
import { Compose } from "~/utils/compose";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ClerkProvider {...pageProps}>
      <DndProvider backend={HTML5Backend}>
        <Compose
          // global providers go here
          components={[]}
        >
          <MainLayout>
            <Component {...pageProps} />
          </MainLayout>
          <Toaster />
        </Compose>
      </DndProvider>
    </ClerkProvider>
  );
};

export default api.withTRPC(MyApp);
