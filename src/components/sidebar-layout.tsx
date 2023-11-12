import { type ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
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
      <nav className="border-b bg-white">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <Link href="/" className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h2 className="text-3xl font-bold">allvoice.ai</h2>
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
      <div
        className={`flex min-h-full ${
          sidebarPosition === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <div className="  lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-50 px-6 py-5 pb-4">
            {sidebarChildren}
          </div>
        </div>
        <div className="flex-1">
          <main className="h-[calc(100vh-theme('spacing.16'))] py-5">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default SidebarLayout;
