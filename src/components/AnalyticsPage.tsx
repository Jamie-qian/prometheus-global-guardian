import React from "react";
import StatisticsCard from "./StatisticsCard";
import ChartsPanel from "./ChartsPanel";
import InsightsPanel from "./InsightsPanel";
import type { Hazard } from "../types";

interface AnalyticsPageProps {
  hazards: Hazard[];
  onClose: () => void;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ hazards, onClose }) => {
  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>Data Analytics Dashboard</h1>
        <button className="close-btn" onClick={onClose}>
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      
      <div className="analytics-content">
        <StatisticsCard hazards={hazards} />
        <InsightsPanel hazards={hazards} />
        <ChartsPanel hazards={hazards} />
      </div>
    </div>
  );
};

export default AnalyticsPage;
