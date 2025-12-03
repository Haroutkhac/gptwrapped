import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/components/DataProvider";
import { loadWrappedData } from "@/lib/dataLoader";
import Sidebar from "@/components/Sidebar";
import OfflineIndicator from "@/components/OfflineIndicator";
import ClearLocalData from "@/components/ClearLocalData";

export const metadata: Metadata = {
  title: "ChatGPT Wrapped",
  description: "Local-first analytics for your ChatGPT conversations.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dataset = await loadWrappedData();
  return (
    <html lang="en">
      <body>
        <DataProvider initialData={dataset}>
          <div className="flex h-screen w-full overflow-hidden bg-black">
            <aside className="hidden md:block h-full">
              <Sidebar />
            </aside>
            <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#121212] md:m-2 md:ml-0 md:rounded-lg">
              {/* Top Bar Area for User/Settings if needed overlaying the scroll view */}
              <div className="absolute top-0 right-0 p-4 z-20 flex gap-2 items-center">
                <OfflineIndicator />
                <ClearLocalData />
              </div>
              
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto scroll-area relative">
                 {children}
              </div>
            </main>
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
