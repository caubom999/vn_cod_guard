import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import DashboardLayout from './pages/dashboard';
import AnalyticsPage from './pages/dashboard/analytics';
import BillingPage from './pages/dashboard/billing';
import BlacklistPage from './pages/dashboard/blacklist';
import OrdersPage from './pages/dashboard/orders';
import OverviewPage from './pages/dashboard/overview';
import SettingsPage from './pages/dashboard/settings';
import TemplatesPage from './pages/dashboard/templates';
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
