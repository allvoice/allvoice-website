import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  debug: false,
  // a private route by default redirects the user if theyre not signed in
  // public/private routes currently handled at procedure/page level, in the future we could change this.
  publicRoutes: ["/(.*)"],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
