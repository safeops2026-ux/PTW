import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clientConfig } from '../config/client'
import { Notifications } from './Notifications'

export function AppShell() {
    const { user } = useAuth()

    return (
        <div className="app-shell">
            <header className="app-header">
                <div>
                    <h1>{clientConfig.companyName}</h1>
                    <p>{clientConfig.siteName} · Permit to Work Suite</p>
                </div>
                <nav>
                    {user ? (
                        <>
                            <Link to="/">Dashboard</Link>
                            <Link to="/permits">Permits</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/signup">Sign up</Link>
                        </>
                    )}
                </nav>
            </header>
            <main>
                <Outlet />
            </main>
            <Notifications />
        </div>
    )
}
