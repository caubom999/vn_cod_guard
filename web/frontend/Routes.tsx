import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import DashboardLayout from './components/dashboard/DashboardLayout';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import BillingPage from './pages/billing/BillingPage';
import BlacklistPage from './pages/blacklist/BlacklistPage';
import OrdersPage from './pages/orders/OrdersPage';
import OverviewPage from './pages/overview/OverviewPage';
import SettingsPage from './pages/settings/SettingsPage';
import TemplatesPage from './pages/templates/TemplatesPage';
import ErrorPage from './pages/Error';
import ExitIframe from './pages/ExitIframe';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'billing', element: <BillingPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'templates', element: <TemplatesPage /> },
          { path: 'blacklist', element: <BlacklistPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
        ],
      },
      { path: 'exit-iframe', element: <ExitIframe /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
