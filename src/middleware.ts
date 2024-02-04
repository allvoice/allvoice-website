import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  debug: false,
  // a private route by default redirects the user if theyre not signed in
  publicRoutes: [
    // api routes
    "/api/trpc/(.*)",
    "/api/webhooks/clerk",
    "/api/webhooks/internal/uploaded-file",
    // pages
    "/",
    "/sign-in/(.*)",
    "/sign-up/(.*)",
    "/voices/:voiceId",
    "/npcs/:uniqueNPCId",
    "/charactermodels/:characterModelId",
  ],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
