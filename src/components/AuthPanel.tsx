import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function AuthPanel() {
    const { user, signIn, signUp, signOutUser } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setMessage('')

        if (!email.trim() || !password.trim()) {
            setMessage('Please enter both email and password.')
            return
        }

        if (password.length < 6) {
            setMessage('Password must be at least 6 characters long.')
            return
        }

        try {
            setSubmitting(true)
            if (mode === 'login') {
                await signIn(email.trim(), password)
                setMessage('Signed in successfully.')
            } else {
                await signUp(email.trim(), password, 'Anonymous User', '')
                setMessage('Account created successfully.')
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Authentication failed.')
        } finally {
            setSubmitting(false)
        }
    }

    if (user) {
        return (
            <div className="card">
                <h3>Signed in</h3>
                <p className="muted">{user.email}</p>
                <button type="button" onClick={() => void signOutUser()}>
                    Sign out
                </button>
            </div>
        )
    }

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h3>{mode === 'login' ? 'Firebase login' : 'Create account'}</h3>
            <p className="muted">Use your Firebase credentials to access the PTW workflow.</p>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
            />
            <div className="auth-actions">
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}
                </button>
                <button type="button" className="secondary-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                    {mode === 'login' ? 'Need an account?' : 'Back to login'}
                </button>
            </div>
            {message ? <p className="message">{message}</p> : null}
        </form>
    )
}
