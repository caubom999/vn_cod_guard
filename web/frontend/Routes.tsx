import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Dashboard from './pages/dashboard';
import ErrorPage from './pages/Error';
import ExitIframe from './pages/ExitIframe';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'exit-iframe', element: <ExitIframe /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
