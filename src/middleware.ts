import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  debug: false,
  // a private route by default redirects the user if theyre not signed in
  publicRoutes: ["/api/webhooks/clerk", "/api/webhooks/internal/uploaded-file"],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
