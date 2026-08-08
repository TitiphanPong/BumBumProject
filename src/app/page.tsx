'use client';

import {
  BarChartOutlined,
  BellOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import Link from 'next/link';

const primaryButton =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[15px] font-semibold text-white transition duration-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:w-auto';
const secondaryButton =
  'inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-[15px] font-semibold text-slate-700 transition duration-200 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200';

function Brand() {
  return (
    <Link
      href="#home"
      className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
      <Image
        src="/favicon.ico"
        alt="ClaimSN Progress"
        width={36}
        height={36}
        className="rounded-lg"
        priority
      />
      <span className="whitespace-nowrap text-[15px] font-bold tracking-[-0.02em] text-slate-900 sm:text-[17px]">
        ClaimSN <span className="text-blue-600">Progress</span>
      </span>
    </Link>
  );
}

function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <nav
        aria-label="เมนูหลัก"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-[68px] sm:px-8">
        <Brand />
      </nav>
    </header>
  );
}

function DashboardPreview() {
  return (
    <div
      className="relative mx-auto w-full min-w-0 max-w-[590px] lg:ml-auto"
      aria-label="ตัวอย่างหน้าจอ Dashboard">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 sm:rounded-[20px] sm:shadow-2xl">
        <div className="flex h-11 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <div className="ml-3 h-5 max-w-48 flex-1 rounded-md border border-slate-200 bg-white" />
        </div>
        <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[72px_minmax(0,1fr)]">
          <div className="border-r border-slate-100 bg-slate-950 px-2 py-4 sm:px-3 sm:py-5">
            <div className="mx-auto mb-7 h-7 w-7 rounded-lg bg-blue-500" />
            {[0, 1, 2, 3].map(item => (
              <div
                key={item}
                className={`mx-auto mb-4 h-7 w-7 rounded-md ${item === 0 ? 'bg-blue-500/25' : 'bg-white/8'}`}
              />
            ))}
          </div>
          <div className="min-w-0 p-3 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  Claim Overview
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 sm:text-base">ภาพรวมงานเคลม</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-100" />
            </div>
            <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-3">
              {[
                ['เคลมทั้งหมด', '284', 'text-slate-900'],
                ['กำลังดำเนินการ', '38', 'text-amber-600'],
                ['สำเร็จแล้ว', '246', 'text-emerald-600'],
              ].map(([label, value, color]) => (
                <div key={label} className="min-w-0 rounded-lg border border-slate-200 p-2 sm:rounded-xl sm:p-3.5">
                  <p className="truncate text-[8px] text-slate-500 sm:text-[10px]">{label}</p>
                  <p className={`mt-1 text-sm font-bold sm:text-xl ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-700">Claims Activity</span>
                  <span className="text-slate-400">7 วัน</span>
                </div>
                <div className="mt-5 flex h-24 items-end gap-2">
                  {[34, 58, 43, 72, 55, 85, 68].map((height, index) => (
                    <div key={index} className="flex h-full flex-1 items-end rounded-sm bg-blue-50">
                      <span
                        className="w-full rounded-sm bg-blue-500"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5">
                <p className="text-[10px] font-semibold text-slate-700">Recent Claims</p>
                <div className="mt-3 space-y-3">
                  {[
                    ['CLM-0124', 'รอตรวจสอบ', 'bg-amber-50 text-amber-700'],
                    ['CLM-0123', 'สำเร็จ', 'bg-emerald-50 text-emerald-700'],
                    ['CLM-0122', 'กำลังเคลม', 'bg-blue-50 text-blue-700'],
                  ].map(([id, status, color]) => (
                    <div key={id} className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-medium text-slate-600">{id}</span>
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-1 text-[8px] font-semibold ${color}`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -left-3 top-20 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 sm:block lg:-left-8">
        <p className="text-[10px] text-slate-500">เคลมใหม่</p>
        <p className="mt-0.5 text-sm font-bold text-slate-900">
          +12 <span className="font-medium text-emerald-600">วันนี้</span>
        </p>
      </div>
      <div className="absolute -bottom-5 right-3 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 sm:flex lg:-right-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <BellOutlined />
        </span>
        <div>
          <p className="text-[10px] text-slate-500">Telegram Notification</p>
          <p className="text-xs font-semibold text-slate-800">
            ส่งสำเร็จ <CheckCircleFilled className="text-emerald-500" />
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="overflow-hidden border-b border-slate-100 bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-12 sm:px-8 sm:py-20 lg:grid-cols-[.92fr_1.08fr] lg:gap-12 lg:py-24">
        <div className="max-w-2xl">
          <h1 className="break-words text-[34px] font-bold leading-[1.22] tracking-[-0.03em] text-slate-950 min-[400px]:text-[38px] sm:text-5xl lg:text-[58px] lg:leading-[1.18]">
            ระบบจัดการเคลมสินค้า
            <br className="hidden sm:block" />
            ที่<span className="text-blue-600">ง่ายและเป็นระบบมากขึ้น</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            จัดการข้อมูลเคลม ติดตามสถานะ และดูรายงานทั้งหมดได้จากระบบเดียว พร้อมการแจ้งเตือนผ่าน
            Telegram แบบเรียลไทม์
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className={primaryButton}>
              เริ่มใช้งานระบบ
            </Link>
          </div>
          <div className="mt-8 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {['ใช้งานง่าย', 'ติดตามสถานะแบบ Real-time', 'รองรับทุกอุปกรณ์'].map(item => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircleFilled className="text-blue-600" />
                {item}
              </span>
            ))}
          </div>
        </div>
        <DashboardPreview />
      </div>
    </section>
  );
}

const features = [
  {
    icon: <FileTextOutlined />,
    title: 'กรอกข้อมูลเคลมได้ง่าย',
    description:
      'แบบฟอร์มออนไลน์ที่ออกแบบให้ใช้งานได้สะดวก ทั้งคอมพิวเตอร์ แท็บเล็ต และโทรศัพท์มือถือ',
  },
  {
    icon: <CheckCircleOutlined />,
    title: 'ติดตามสถานะแบบ Real-time',
    description: 'ตรวจสอบสถานะเคลมและความคืบหน้าได้ตลอดเวลา พร้อมข้อมูลที่อัปเดตล่าสุด',
  },
  {
    icon: <BarChartOutlined />,
    title: 'Dashboard และรายงาน',
    description: 'ดูภาพรวมข้อมูลเคลมผ่าน Dashboard พร้อมกราฟและข้อมูลแยกตามประเภทหรือจังหวัด',
  },
];

function FeatureSection() {
  return (
    <section id="features" className="bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-blue-600">ฟีเจอร์ของระบบ</p>
          <h2 className="mt-3 break-words text-[28px] font-bold leading-tight tracking-[-0.025em] text-slate-950 sm:text-4xl">
            ทุกอย่างที่จำเป็นสำหรับการจัดการเคลม
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            ลดขั้นตอนการทำงานและติดตามข้อมูลได้จากระบบเดียว
          </p>
        </div>
        <div className="mt-9 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-3">
          {features.map(feature => (
            <article
              key={feature.title}
              className="landing-card rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-900/5 sm:p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
                {feature.icon}
              </span>
              <h3 className="mt-6 text-xl font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TelegramSection() {
  return (
    <section className="bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <div className="mx-auto w-full min-w-0 max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 sm:rounded-[24px] sm:p-7">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-lg text-white">
              <BellOutlined />
            </span>
            <div>
              <p className="font-bold text-slate-900">ClaimSN Progress</p>
              <p className="text-xs text-emerald-600">Telegram notification</p>
            </div>
          </div>
          <div className="mt-5 min-w-0 break-words rounded-2xl rounded-tl-md bg-sky-50 p-4 text-sm leading-7 text-slate-700 sm:p-5">
            <p className="font-bold text-slate-950">🔔 เคลมใหม่ #CLM-2026-00124</p>
            <div className="my-3 h-px bg-sky-100" />
            <p>สินค้า: เครื่องปรับอากาศ</p>
            <p>จังหวัด: กรุงเทพมหานคร</p>
            <p>
              สถานะ: <span className="font-semibold text-amber-700">รอตรวจสอบ</span>
            </p>
            <p className="mt-3 text-right text-[11px] text-slate-400">10:42 ✓✓</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-600">Real-time notification</p>
          <h2 className="mt-3 break-words text-[28px] font-bold leading-tight tracking-[-0.025em] text-slate-950 sm:text-4xl">
            ไม่พลาดทุกสถานะสำคัญ
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
            รับการแจ้งเตือนข้อมูลเคลมผ่าน Telegram
            ช่วยให้ทีมสามารถติดตามงานและตอบสนองได้รวดเร็วยิ่งขึ้น
          </p>
          <ul className="mt-7 space-y-4 text-[15px] font-medium text-slate-700">
            {['แจ้งเตือนเคลมใหม่', 'แจ้งเตือนการเปลี่ยนสถานะ', 'ดูข้อมูลสำคัญได้ทันที'].map(
              item => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircleFilled className="text-blue-600" />
                  {item}
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Brand />
        </div>
        <div className="text-sm leading-6 text-slate-500 md:text-right">
          <p>© 2569 ClaimSN Progress</p>
          <p>Developed by Titiphan Pongsuwan</p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white text-slate-900">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeatureSection />
        <TelegramSection />
      </main>
      <LandingFooter />
    </div>
  );
}
