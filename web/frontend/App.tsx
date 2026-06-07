import { Outlet } from 'react-router-dom';
import { PolarisProvider } from './components';
import QueryProvider from './components/providers/QueryProvider';
import Nav from './components/nav';

export default function App() {
  return (
    <PolarisProvider>
      <QueryProvider>
        <Nav />
        <Outlet />
      </QueryProvider>
    </PolarisProvider>
  );
}
