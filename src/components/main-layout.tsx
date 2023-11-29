import Header from "~/components/header";
import { type ReactNode } from "react";
import StatusBar from "~/components/status-bar";
type Props = {
  children?: ReactNode;
};

const MainLayout: React.FC<Props> = ({ children }) => {
  return (
    <>
      <div className="min-h-full">
        <Header />
        <main className="h-[calc(100vh-theme('spacing.16'))]">
          <div className="mx-auto max-w-7xl space-y-4 px-2 py-2 sm:px-6 md:py-10 lg:px-8">
            {children}
          </div>
        </main>
        <StatusBar className="fixed bottom-0 left-0 z-30  w-full" />
      </div>
    </>
  );
};

export default MainLayout;
