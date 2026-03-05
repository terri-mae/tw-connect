import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: 220 }}>
        {children ?? <Outlet />}
      </div>
    </div>
  );
}
