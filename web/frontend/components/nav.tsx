import { NavMenu } from '@shopify/app-bridge-react';
import { Link, useLocation } from 'react-router-dom';

export default function Nav() {
  const { search } = useLocation();

  const dashboardPath = (path: string) => `${path}${search}`;

  return (
    <NavMenu>
      <Link to={dashboardPath('/')} rel="home">
        Overview
      </Link>
      <Link to={dashboardPath('/orders')}>Orders</Link>
      <Link to={dashboardPath('/cod-fee')}>COD fee</Link>
      <Link to={dashboardPath('/billing')}>Billing</Link>
      <Link to={dashboardPath('/settings')}>Settings</Link>
      <Link to={dashboardPath('/templates')}>Message templates</Link>
      <Link to={dashboardPath('/sms-providers')}>SMS connections</Link>
      <Link to={dashboardPath('/blacklist')}>Blacklist</Link>
      <Link to={dashboardPath('/analytics')}>Analytics</Link>
    </NavMenu>
  );
}
