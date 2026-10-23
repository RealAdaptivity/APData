import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/errors';
import { Button, ErrorNote, Field, Input, Notice } from '../components/ui';

export function SignInPage({ notice }: { notice: string | null }) {
  const { signIn, sendReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(errorText(err, 'Sign-in failed.'));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap “Forgot password”.');
      return;
    }
    try {
      await sendReset(email);
      setResetSent(true);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={`${import.meta.env.BASE_URL}logo-128.png`} alt="" className="h-16 w-16 rounded-2xl" width={64} height={64} />
          <h1 className="font-heading text-3xl font-bold text-white">
            AP <span className="text-brand">Data</span>
          </h1>
          <p className="text-sm text-slate-400">Repair information for Adaptivity Performance technicians.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-panel p-5">
          {notice && <Notice tone="amber">{notice}</Notice>}
          <Field label="Email">
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <ErrorNote message={error} />}
          {resetSent && <Notice tone="blue">Check your email for a password reset link.</Notice>}
          <Button type="submit" variant="primary" loading={busy} icon={<Lock className="h-4 w-4" />} className="w-full">
            Sign in
          </Button>
          <button type="button" onClick={() => void reset()} className="block w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-200">
            Forgot password
          </button>
        </form>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          Use the same email and password as the Adaptivity tech app or admin portal. Accounts are for Adaptivity staff only.
        </p>
      </div>
    </div>
  );
}
