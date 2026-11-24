import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Feed from './pages/Feed'
import Explore from './pages/Explore'
import EventDetail from './pages/EventDetail'
import Login from './pages/Login'
import Signup from './pages/Signup'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardHome from './pages/dashboard/DashboardHome'
import CreatePost from './pages/dashboard/CreatePost'
import HostEvent from './pages/dashboard/HostEvent'
import VolunteerHub from './pages/dashboard/VolunteerHub'
import FoodDonation from './pages/dashboard/FoodDonation'
import IssueReporting from './pages/dashboard/IssueReporting'
import CivicPolls from './pages/dashboard/CivicPolls'
import ImpactAI from './pages/dashboard/ImpactAI'
import MyActivities from './pages/dashboard/MyActivities'
import MyProfile from './pages/dashboard/MyProfile'
import HostDashboard from './pages/host/HostDashboard'
import ParticipateDashboard from './pages/host/ParticipateDashboard'
import AdminLayout from './pages/admin/AdminLayout'
import AdminReports from './pages/admin/AdminReports'
import AdminUsers from './pages/admin/AdminUsers'
import AdminContent from './pages/admin/AdminContent'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Feed />} />
            <Route path="explore" element={<Explore />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="events/:id/edit" element={<RequireAuth><HostEvent /></RequireAuth>} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="host" element={<RequireAuth><HostDashboard /></RequireAuth>} />
            <Route path="host/new" element={<RequireAuth><HostEvent /></RequireAuth>} />
            <Route path="participate" element={<RequireAuth><ParticipateDashboard /></RequireAuth>} />
            <Route path="dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
              <Route index element={<DashboardHome />} />
              <Route path="create-post" element={<CreatePost />} />
              <Route path="host-event" element={<Navigate to="/host/new" replace />} />
              <Route path="volunteer" element={<VolunteerHub />} />
              <Route path="food" element={<FoodDonation />} />
              <Route path="issues" element={<IssueReporting />} />
              <Route path="polls" element={<CivicPolls />} />
              <Route path="impact-ai" element={<ImpactAI />} />
              <Route path="activities" element={<MyActivities />} />
              <Route path="profile" element={<MyProfile />} />
            </Route>
            <Route path="admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
              <Route index element={<AdminReports />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="content" element={<AdminContent />} />
            </Route>
            <Route path="*" element={<div className="card text-center">Page not found.</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
