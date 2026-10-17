'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, MapPin, RotateCcw } from 'lucide-react';

type RecoveryStateProps = {
  kind: 'error' | 'not-found';
  onRetry?: () => void;
};

export default function RecoveryState({ kind, onRetry }: RecoveryStateProps) {
  const isError = kind === 'error';
  const Icon = isError ? AlertCircle : MapPin;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-8">
      <section aria-labelledby="recovery-title" className="w-full max-w-md rounded-2xl border border-[#E5E8EB] bg-white p-6 text-center shadow-sm md:p-8">
        <div className={`mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm ring-1 ring-black/5 ${isError ? 'from-red-500 to-rose-600' : 'from-blue-500 to-indigo-500'}`}>
          <Icon size={24} className="text-white" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs font-semibold text-[#8B95A1]">{isError ? '잠시 이용이 어려워요' : '페이지를 찾을 수 없어요'}</p>
        <h1 id="recovery-title" className="text-xl font-semibold tracking-tight text-[#191F28] md:text-2xl">
          {isError ? '다시 한번 시도해보세요' : '주소를 다시 확인해주세요'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#4E5968]">
          {isError ? '화면을 불러오지 못했어요. 잠시 후 다시 시도해주세요.' : '주소가 변경되었거나 사용할 수 없는 페이지예요. 홈에서 원하는 기능을 찾아보세요.'}
        </p>
        <div className="mt-7 flex flex-col gap-3">
          {isError && onRetry ? (
            <button type="button" onClick={onRetry} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#3182F6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2A6FE0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3182F6]">
              <RotateCcw size={16} aria-hidden="true" /> 다시 시도
            </button>
          ) : null}
          <Link href="/" className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3182F6] ${isError ? 'bg-[#F8F9FA] text-[#4E5968] hover:bg-[#E5E8EB]' : 'bg-[#3182F6] text-white hover:bg-[#2A6FE0]'}`}>
            홈으로 돌아가기 <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-6 text-xs leading-5 text-[#8B95A1]">
          문제가 계속되면 <Link href="/inquiry" className="inline-flex min-h-[44px] items-center font-semibold text-[#3182F6] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3182F6]">문의하기</Link>에서 알려주세요.
        </p>
      </section>
    </main>
  );
}
