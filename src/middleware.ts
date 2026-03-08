import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/sign-in"]);
const isAuthApi = createRouteMatcher(["/api/auth(.*)"]);
const isProtectedRoute = createRouteMatcher([
  "/friends",
  "/onboarding",
  "/",
]);

export default convexAuthNextjsMiddleware(async (request, ctx) => {
  const authenticated = await ctx.convexAuth.isAuthenticated();

  if (isSignInPage(request) && authenticated) {
    return nextjsMiddlewareRedirect(request, "/");
  }
  if (
    isProtectedRoute(request) &&
    !isSignInPage(request) &&
    !isAuthApi(request) &&
    !authenticated
  ) {
    return nextjsMiddlewareRedirect(request, "/sign-in");
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
