import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clientConfig } from '../config/client'
import { Notifications } from './Notifications'

export function AppShell() {
    const { user, profile, signOutUser } = useAuth()

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="brand">
                    <h1>{clientConfig.companyName}</h1>
                    <p>{clientConfig.siteName} · Permit to Work Suite</p>
                </div>
                <div className="header-actions">
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
                    {user ? (
                        <div className="user-chip">
                            <span>{profile?.name ?? profile?.email ?? 'User'}</span>
                            <button type="button" onClick={() => void signOutUser()}>
                                Sign out
                            </button>
                        </div>
                    ) : null}
                </div>
            </header>
            <main>
                <Outlet />
            </main>
            <Notifications />
        </div>
    )
}
