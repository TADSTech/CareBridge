import React, { FormEvent, useState } from 'react';
import { AccountSession, signIn, signUp } from '../services/accountStore';
import { HeartHandshake, LoaderCircle } from 'lucide-react';

interface AccountAccessProps { onAuthenticated: (session: AccountSession) => void; }

export const AccountAccess: React.FC<AccountAccessProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'sign-in') onAuthenticated(await signIn(email, password));
      else {
        const session = await signUp(email, password);
        if (session) onAuthenticated(session);
        else { setNotice('Check your email to confirm the account, then sign in.'); setMode('sign-in'); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not access this account.'); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-pearl flex items-center justify-center px-4 py-10">
      <section className="surface-card w-full max-w-md p-6 sm:p-8">
        <div className="w-12 h-12 rounded-2xl bg-iris-pulse/10 text-iris-pulse flex items-center justify-center mb-5"><HeartHandshake className="w-6 h-6" /></div>
        <h1 className="text-2xl font-semibold text-deep-iris">CareBridge account</h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-fog">Sign in to save this consultation to your private account. Use fictional information in this prototype.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-deep-iris">Email
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-input border border-ash bg-cloud-white px-3 py-2.5 text-sm focus:outline-none focus:border-iris-pulse" />
          </label>
          <label className="block text-sm font-medium text-deep-iris">Password
            <input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-input border border-ash bg-cloud-white px-3 py-2.5 text-sm focus:outline-none focus:border-iris-pulse" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="text-sm text-iris-pulse">{notice}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-pill bg-iris-pulse px-4 py-2.5 text-sm font-semibold text-cloud-white hover:bg-iris-glow disabled:opacity-60 flex justify-center items-center gap-2">
            {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}{mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="mt-5 text-sm text-fog text-center">
          {mode === 'sign-in' ? 'New here?' : 'Already have an account?'}{' '}
          <button className="font-semibold text-iris-pulse hover:underline" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setNotice(''); }}>
            {mode === 'sign-in' ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </section>
    </main>
  );
};
