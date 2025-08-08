'use client';

import { Button } from "antd";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileTextOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
} from "@ant-design/icons";


export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 backdrop-blur-sm shadow-md sticky top-0 z-50">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="text-xl font-semibold tracking-tight text-gray-800"
        >
          ClaimSN Progress
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center text-center px-6 py-16 md:py-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 leading-snug"
        >
          ระบบจัดการเคลมสินค้า<br />
          ClaimSNProgress
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-gray-600 text-lg max-w-xl mb-8"
        >
          การจัดการข้อมูลเคลมทั้งหมดในระบบออนไลน์ พร้อมแจ้งเตือนผ่านช่องทาง Telegram และสรุปรายงานในรูปแบบของ Dashboard เรียลไทม์
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link href="/dashboard">
            <Button type="primary" size="large">เริ่มใช้งานเลย</Button>
          </Link>
        </motion.div>
      </section>

      {/* Feature Section */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 text-center">
{[
  {
    title: "กรอกฟอร์มง่าย",
    desc: "ฟอร์มออนไลน์สะดวกทุกอุปกรณ์ รองรับมือถือ แท็บเล็ต เดสก์ท็อป",
    icon: <FileTextOutlined className="text-4xl text-blue-500 mb-4" />,
  },
  {
    title: "ติดตามสถานะ",
    desc: "ตรวจสอบสถานะเคลม เช่น รอตรวจสอบ จบเคลม ได้ตลอดเวลา",
    icon: <CheckCircleOutlined className="text-4xl text-green-500 mb-4" />,
  },
  {
    title: "Dashboard สรุปผล",
    desc: "แสดงผลเป็น Graph Chart แยกตามผู้เคลม/จังหวัด อย่างชัดเจน",
    icon: <BarChartOutlined className="text-4xl text-purple-500 mb-4" />,
  },
].map((feature, i) => (
  <motion.div
    key={i}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: i * 0.2 }}
    viewport={{ once: true }}
    className="bg-gray-50 rounded-2xl shadow-sm p-8 hover:shadow-md transition-shadow"
  >
    <div className="flex justify-center">{feature.icon}</div>
    <h3 className="text-xl font-semibold text-gray-800 mt-4">{feature.title}</h3>
    <p className="text-gray-600 text-sm mt-2 leading-relaxed">{feature.desc}</p>
  </motion.div>
))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-400 py-6 text-sm">
        © {new Date().getFullYear()} ClaimSN Progress — Developed by Titiphan Pongsuwan.
      </footer>
    </main>
  );
}