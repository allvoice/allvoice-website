/* eslint-disable @next/next/no-img-element */
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useOpenSearch } from "~/contexts/open-search-hook";
import Device from "./device";
import { PlusIcon } from "@heroicons/react/20/solid";
import { Button } from "./ui/button";
import { useRouter } from "next/router";

const Header: React.FC = ({}) => {
  const { setOpen } = useOpenSearch();
  const router = useRouter();

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex">
            <div className="flex flex-shrink-0 items-center">
              <h2 className="text-3xl font-bold">allvoice.ai</h2>
            </div>
          </Link>

          <div
            onClick={() => setOpen((cur) => !cur)}
            className="flex h-8 w-full max-w-md items-center justify-center rounded-md border hover:cursor-pointer hover:bg-gray-100"
          >
            <p className="select-none text-center text-sm text-slate-500 ">
              <Device>
                {({ isMacOs }) => <>{isMacOs ? "⌘P" : "Ctrl+P"} to search</>}
              </Device>
            </p>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link
                href="/voicemodels/create"
                className="relative inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                New Voice
              </Link>
            </div>
            <div className="ml-4">
              <SignedOut>
                <SignInButton mode="modal" redirectUrl={router.asPath}>
                  <Button variant="ghost" className="px-3 py-2">
                    Sign in
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl={router.asPath} />
              </SignedIn>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
