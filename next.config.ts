import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin và nodemailer chỉ chạy phía server, không đóng gói vào bundle
  serverExternalPackages: ["firebase-admin", "nodemailer"],
};

export default nextConfig;
