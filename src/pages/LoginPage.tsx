import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'

export function LoginPage() {
    const { user, signIn, signInWithGoogle, resetPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [phone, setPhone] = useState('')
    const [otp, setOtp] = useState('')
    const [confirmationResult, setConfirmationResult] = useState<any | null>(null)
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [phoneStep, setPhoneStep] = useState<'request' | 'verify'>('request')
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

    const { notify } = useNotification()

    useEffect(() => {
        if (user) {
            navigate(from, { replace: true })
        }
    }, [user, from, navigate])

    const getRecaptchaVerifier = () => {
        return new RecaptchaVerifier(
            auth,
            'recaptcha-container',
            { size: 'invisible' },
        )
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setMessage('')

        if (!email.trim() || !password.trim()) {
            setMessage('Enter both email and password.')
            return
        }

        try {
            setLoading(true)
            await signIn(email.trim(), password)
            notify('Signed in successfully.', 'success')
            navigate(from, { replace: true })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign in failed.'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true)
            await signInWithGoogle()
            notify('Signed in with Google successfully.', 'success')
            navigate(from, { replace: true })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Google sign in failed.'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordReset = async () => {
        if (!email.trim()) {
            setMessage('Enter your email address to reset your password.')
            return
        }

        try {
            setLoading(true)
            await resetPassword(email.trim())
            notify('Password reset email sent. Check your inbox.', 'success')
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed.'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSendPhoneCode = async () => {
        setMessage('')
        if (!phone.trim()) {
            setMessage('Enter your phone number with country code.')
            return
        }

        try {
            setLoading(true)
            const verifier = getRecaptchaVerifier()
            const result = await signInWithPhoneNumber(auth, phone.trim(), verifier)
            setConfirmationResult(result)
            setPhoneStep('verify')
            notify('SMS code sent. Enter it below to verify.', 'success')
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send SMS code.'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyPhoneCode = async () => {
        setMessage('')
        if (!confirmationResult) {
            setMessage('No SMS code request has been made.')
            return
        }

        if (!otp.trim()) {
            setMessage('Enter the verification code.')
            return
        }

        try {
            setLoading(true)
            await confirmationResult.confirm(otp.trim())
            notify('Logged in with phone successfully.', 'success')
            navigate(from, { replace: true })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Phone verification failed.'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="dashboard">
            <div className="card">
                <h2>Login</h2>
                <p className="muted">Sign in with email, Google, or phone number to access the PTW dashboard.</p>
                <form onSubmit={handleSubmit}>
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
                        {loading ? 'Logging in…' : 'Login'}
                    </button>
                </form>
                <button type="button" className="secondary" onClick={handleGoogleSignIn} disabled={loading}>
                    Sign in with Google
                </button>
                <button type="button" className="secondary" onClick={handlePasswordReset} disabled={loading}>
                    Reset password
                </button>
                <div className="divider">or</div>
                <div className="phone-login">
                    {phoneStep === 'request' ? (
                        <>
                            <input
                                type="tel"
                                placeholder="Phone number (+country code)"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                            />
                            <button type="button" onClick={handleSendPhoneCode} disabled={loading}>
                                Send SMS code
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                placeholder="Verification code"
                                value={otp}
                                onChange={(event) => setOtp(event.target.value)}
                            />
                            <button type="button" onClick={handleVerifyPhoneCode} disabled={loading}>
                                Verify code
                            </button>
                        </>
                    )}
                </div>
                <div id="recaptcha-container" />
                {message ? <p className="message">{message}</p> : null}
                <p>
                    New here? <Link to="/signup">Create an account</Link>
                </p>
            </div>
        </section>
    )
}
