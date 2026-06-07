import { NavMenu } from '@shopify/app-bridge-react';
import { Link } from 'react-router-dom';

export default function Nav() {
  return (
    <NavMenu>
      <Link to="/">Home</Link>
    </NavMenu>
  );
}
