export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full animate-pulse px-5 py-8 md:px-6 lg:px-10" aria-busy="true">
      <span className="sr-only">กำลังโหลดข้อมูล</span>
      <div className="mb-8 h-9 w-full max-w-md rounded-lg bg-slate-200" />
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-[360px] rounded-3xl bg-slate-200" />
    </main>
  );
}
