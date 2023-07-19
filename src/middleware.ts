import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  debug: false,
  // a private route by default redirects the user if theyre not signed in
  publicRoutes: [""],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
