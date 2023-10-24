/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { type ReactNode } from "react";
import SidebarHeader from "./sidebar-header";
type Props = {
  children?: ReactNode;
  sidebarChildren?: ReactNode;
};

const LeftSidebarLayout: React.FC<Props> = ({ children, sidebarChildren }) => {
  return (
    <div className="flex min-h-full">
      <div className="lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-50 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/" className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h2 className="text-3xl font-bold">allvoice.ai</h2>
              </div>
            </Link>
          </div>
          {sidebarChildren}
        </div>
      </div>
      <div className="flex-1">
        <SidebarHeader />
        <main className="h-[calc(100vh-theme('spacing.16'))] py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
  // return (
  //   <>
  //     <div className="min-h-full">
  //       <Header />
  //       <main className="h-[calc(100vh-theme('spacing.16'))]">

  //         <div className="mx-auto max-w-7xl space-y-4 px-2 py-2 sm:px-6 md:py-10 lg:px-8">
  //           {children}
  //         </div>
  //         <div className="fixed bottom-0 left-0 h-2 w-full">
  //           <AudioSeekBar className="h-2" />
  //         </div>
  //       </main>
  //     </div>
  //   </>
  // );
};

export default LeftSidebarLayout;
