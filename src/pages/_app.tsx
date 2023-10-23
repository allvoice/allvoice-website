import { ClerkProvider } from "@clerk/nextjs";
import { type AppType } from "next/app";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Toaster } from "~/components/ui/toaster";
import "~/styles/globals.css";
import { api } from "~/utils/api";
import { Compose } from "~/utils/compose";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ClerkProvider {...pageProps}>
      <DndProvider backend={HTML5Backend}>
        <Compose
          // global providers go here
          components={[]}
        >
          <Component {...pageProps} />
          <Toaster />
        </Compose>
      </DndProvider>
    </ClerkProvider>
  );
};

export default api.withTRPC(MyApp);
