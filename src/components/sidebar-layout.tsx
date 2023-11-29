import { type ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import StatusBar from "~/components/status-bar";

type Props = {
  children?: ReactNode;
  sidebarChildren?: ReactNode;
  sidebarPosition?: "left" | "right";
};

const SidebarLayout: React.FC<Props> = ({
  children,
  sidebarChildren,
  sidebarPosition = "right",
}) => {
  return (
    <>
      <nav className="h-10 border-b bg-white">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-10 justify-between">
            <Link href="/" className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h2 className="text-xl font-bold">allvoice.ai</h2>
              </div>
            </Link>
            <div className="flex items-center">
              <div className="flex-shrink-0"></div>
              <div className="ml-4">
                <UserButton />
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main
        className={`flex h-[calc(100vh-theme('spacing.16'))] ${
          sidebarPosition === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <div className="h-full lg:flex lg:w-72 lg:flex-col">
          <div className="flex h-full flex-col gap-y-5 overflow-y-auto bg-slate-50 px-5 py-5 pb-4">
            {sidebarChildren}
          </div>
        </div>
        <div className="flex-1">
          <div className="h-full py-5">{children}</div>
        </div>
      </main>
      <StatusBar className="fixed bottom-0 left-0 z-30  w-full" />
    </>
  );
};

export default SidebarLayout;
