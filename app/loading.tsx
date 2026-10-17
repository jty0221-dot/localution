export default function Loading() {
 return (
    <main role="status" aria-live="polite" aria-busy="true" className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-8">
      <span className="sr-only">화면을 불러오고 있어요. 잠시만 기다려주세요.</span>
      <div aria-hidden="true" className="w-full max-w-md space-y-4 motion-safe:animate-pulse">
        <div className="rounded-2xl border border-[#E5E8EB] bg-white p-6 shadow-sm md:p-8">
          <div className="mx-auto mb-6 h-12 w-12 rounded-xl bg-[#E5E8EB]" />
          <div className="mx-auto mb-4 h-7 w-3/4 rounded-lg bg-[#E5E8EB]" />
          <div className="mb-2 h-4 rounded-lg bg-[#E5E8EB]" />
          <div className="mx-auto mb-7 h-4 w-4/5 rounded-lg bg-[#E5E8EB]" />
          <div className="h-12 rounded-xl bg-[#3182F6]/10" />
 </div>
        <div className="space-y-3 rounded-2xl border border-[#E5E8EB] bg-white p-6 shadow-sm">
          <div className="h-4 rounded-lg bg-[#E5E8EB]" />
          <div className="h-4 w-4/5 rounded-lg bg-[#E5E8EB]" />
          <div className="h-4 w-3/4 rounded-lg bg-[#E5E8EB]" />
 </div>
 </div>
    </main>
 );
}
