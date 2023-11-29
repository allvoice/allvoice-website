import { ClerkProvider } from "@clerk/nextjs";
import { type AppType } from "next/app";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import CommandBar from "~/components/command-bar";
import { Toaster } from "~/components/ui/toaster";
import { OpenSearchProvider } from "~/hooks/open-search-hook";
import "~/styles/globals.css";
import { api } from "~/utils/api";
import { Compose } from "~/utils/compose";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ClerkProvider {...pageProps}>
      <DndProvider backend={HTML5Backend}>
        <Compose
          // global providers go here
          components={[OpenSearchProvider]}
        >
          <Component {...pageProps} />

          <Toaster />
          <CommandBar />
        </Compose>
        <ReactQueryDevtools initialIsOpen={false} />
      </DndProvider>
    </ClerkProvider>
  );
};

export default api.withTRPC(MyApp);
