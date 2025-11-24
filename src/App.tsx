import React, { useState, useEffect } from "react";
import { authorize } from "./api/auth";
import Header from "./components/Header";
import StatusPanel from "./components/StatusPanel";
import LegendPanel from "./components/LegendPanel";
import MapView from "./components/MapView";
import SaveReportModal from "./components/SaveReportModal";
import SettingsModal from "./components/SettingsModal";
import AnalyticsPage from "./components/AnalyticsPage";
import type { Hazard, SaveReportPayload } from "./types";

const App: React.FC = () => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("dark-v11");
  const [disasters, setDisasters] = useState<Hazard[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    (async () => {
      try {
        await authorize();
      } catch (error) {
        console.error("Initial authorization failed:", error);
        // App can still work with other data sources
      }
    })();
  }, []);

  // Handle updates from MapView
  const handleDisastersUpdate = (data: Hazard[]) => {
    setDisasters(data);
  };

  const handleStyleChange = (style: string) => {
    setSelectedStyle(style);
  };

  // Handle download report
  const handleDownloadReport = (payload: SaveReportPayload) => {
    // 可以在这里添加下载逻辑，比如发送到后端或生成文件
    console.log("Download report:", payload);
  };

  // Handle global key press for Escape to close modals
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSaveModalOpen(false);
        setIsSettingsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <Header
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
      />
      <main>
        {isAnalyticsOpen ? (
          <AnalyticsPage 
            hazards={disasters} 
            onClose={() => setIsAnalyticsOpen(false)}
          />
        ) : (
          <>
            <MapView
              mapStyle={selectedStyle}
              onDataUpdate={handleDisastersUpdate}
              filter={filter}
            />
            <StatusPanel
              filter={filter}
              onFilterChange={newFilter => setFilter(newFilter)}
              onRefresh={() => window.location.reload()}
              totalCount={disasters.length}
            />
            <LegendPanel />
          </>
        )}

        <SaveReportModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onDownload={handleDownloadReport}
          disasters={disasters}
          filter={filter}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onStyleChange={handleStyleChange}
        />
      </main>
    </>
  );
};

export default App;
