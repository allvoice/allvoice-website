import { SignIn } from "@clerk/nextjs";
 
const SignInPage = () => (
  <div className="flex justify-center items-center min-h-screen">
    <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
  </div>
);
 
export default SignInPage;