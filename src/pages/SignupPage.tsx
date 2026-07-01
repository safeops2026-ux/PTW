import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'

export function SignupPage() {
    const { signUp } = useAuth()
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const { notify } = useNotification()

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setMessage('')

        if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
            setMessage('Enter name, phone, email, and password.')
            return
        }

        if (password.length < 6) {
            setMessage('Password must be at least 6 characters.')
            return
        }

        try {
            setLoading(true)
            await signUp(email.trim(), password, name.trim(), phone.trim())
            notify('Account created successfully.', 'success')
            navigate('/', { replace: true })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign up failed.'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="dashboard">
            <div className="card">
                <h2>Sign up</h2>
                <p className="muted">Create a PTW account to access the dashboard.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                    />
                    <input
                        type="tel"
                        placeholder="Phone number (+country code)"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        required
                    />
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
                    <button type="submit" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create account'}
                    </button>
                    {message ? <p className="message">{message}</p> : null}
                </form>
                <p>
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </section>
    )
}
