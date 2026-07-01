import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { RequireAuth } from './components/RequireAuth'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppShell />,
        children: [
            {
                index: true,
                element: (
                    <RequireAuth>
                        <App />
                    </RequireAuth>
                ),
            },
            {
                path: 'permits',
                element: (
                    <RequireAuth>
                        <App />
                    </RequireAuth>
                ),
            },
            {
                path: 'login',
                element: <LoginPage />,
            },
            {
                path: 'signup',
                element: <SignupPage />,
            },
            {
                path: '*',
                element: <Navigate to="/" replace />,
            },
        ],
    },
])
