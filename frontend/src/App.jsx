import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import BrowsePage from "./pages/BrowsePage.jsx";
import MediaDetailsPage from "./pages/MediaDetailsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import CollectionsPage from "./pages/CollectionsPage.jsx";
import CollectionPage from "./pages/CollectionPage.jsx";
import RequireAuth from "./components/RequireAuth.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BrowsePage />} />
        <Route path="media/:id" element={<MediaDetailsPage />} />
        <Route path="library" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route path="collections" element={<RequireAuth><CollectionsPage /></RequireAuth>} />
        <Route path="collections/:id" element={<RequireAuth><CollectionPage /></RequireAuth>} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
