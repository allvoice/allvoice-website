/* eslint-disable @next/next/no-img-element */
import { UserButton } from "@clerk/nextjs";
import { PlusIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

const SidebarHeader: React.FC = ({}) => {
  return (
    <nav className="bg-white shadow">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div></div>
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
              <UserButton />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default SidebarHeader;
