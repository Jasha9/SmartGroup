import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AIPlannerPage from "./pages/AIPlannerPage";
import GroupWorkspacePage from "./pages/GroupWorkspacePage";
import CharterPage from "./pages/CharterPage";
import ContributionDashboardPage from "./pages/ContributionDashboardPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ai-planner" element={<AIPlannerPage />} />
        <Route path="/workspace" element={<GroupWorkspacePage />} />
        <Route path="/charter" element={<CharterPage />} />
        <Route path="/contributions" element={<ContributionDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
