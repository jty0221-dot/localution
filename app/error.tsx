'use client';

import { useEffect } from 'react';
import RecoveryState from './components/ui/RecoveryState';
import { reportError } from './lib/telemetry';

interface ErrorProps {
 error: Error & { digest?: string };
 reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
 useEffect(() => {
 reportError(error, {
 level: 'error',
 digest: error.digest,
 route: typeof window !== 'undefined' ? window.location.pathname : undefined,
 tags: { boundary: 'error' },
 });
 }, [error]);

  return <RecoveryState kind="error" onRetry={reset} />;
}
