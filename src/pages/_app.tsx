import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";

import {
  ClerkProvider,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { useRouter } from "next/router";
import MainLayout from "~/components/MainLayout";
import { Toaster } from "~/components/ui/toaster";
import { Compose } from "~/utils/compose";

//  List pages you want to be publicly accessible, or leave empty if
//  every page requires authentication. Use this naming strategy:
//   "/"              for pages/index.js
//   "/foo"           for pages/foo/index.js
//   "/foo/bar"       for pages/foo/bar.js
//   "/foo/[...bar]"  for pages/foo/[...bar].js
const publicPages: Array<string> = [];

const MyApp: AppType = ({ Component, pageProps }) => {
  // Get the pathname
  const { pathname } = useRouter();

  // Check if the current route matches a public page
  const isPublicPage = publicPages.includes(pathname);

  return (
    <>
      <ClerkProvider {...pageProps}>
        <Compose
          // global providers go here
          components={[]}
        >
          {isPublicPage ? (
            <>
              <MainLayout>
                <Component {...pageProps} />
              </MainLayout>
              <Toaster />
            </>
          ) : (
            <>
              <SignedIn>
                <MainLayout>
                  <Component {...pageProps} />
                </MainLayout>
                <Toaster />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          )}
        </Compose>
      </ClerkProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
