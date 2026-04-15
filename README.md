<div align="center">

![VulnSight X Banner](https://raw.githubusercontent.com/sigmaboysigmaboy888-prog/Vs-x/refs/heads/main/vsx.png)

# 🔍 VulnSight X

### *Web Penetration Testing Tool*

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-000000.svg)]()
[![WebSocket](https://img.shields.io/badge/WebSocket-8.14.2-4A90E2.svg)]()
[![Puppeteer](https://img.shields.io/badge/Puppeteer-21.5.0-40B5A4.svg)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-06B6D4.svg)]()

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)]()
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-1f425f.svg)]()

</div>

---

## 📋 Tentang VulnSight X

VulnSight X adalah **alat penetration testing web** dengan arsitektur modular. Tool ini mengimplementasikan 6 fase pentest:

> **Reconnaissance → Crawling → Mapping → Scanning → Risk Analysis → Reporting**

Dibangun dengan Node.js untuk backend dan Tailwind CSS untuk antarmuka pengguna.

---

## ✅ Fitur yang Tersedia (Berdasarkan Source Code)

### Core System

| Komponen | File | Status |
|----------|------|--------|
| Reconnaissance (subdomain + teknologi) | `core/pipeline.js` | ✅ Berfungsi |
| Smart Crawler (Puppeteer) | `core/crawler.js` | ✅ Berfungsi |
| Attack Surface Mapper | `core/mapper.js` | ✅ Berfungsi |
| Scanner Engine (plugin-based) | `core/scanner.js` | ✅ Berfungsi |
| Risk Engine (CVSS-like) | `core/riskEngine.js` | ✅ Berfungsi |
| HTTP Interceptor | `core/interceptor.js` | ✅ Berfungsi |
| WebSocket Real-time | `server.js` + `app.js` | ✅ Berfungsi |
| HTML Report | `app.js` | ✅ Berfungsi |

### Vulnerability Plugins (5 Plugin)

| Plugin | File | Severity | Mode |
|--------|------|----------|------|
| SQL Injection | `plugins/sqli.js` | Critical | Active |
| XSS (Reflected) | `plugins/xss.js` | High | Active |
| SSRF | `plugins/ssrf.js` | High | Active |
| Open Redirect | `plugins/openRedirect.js` | Medium | Active |
| Security Headers | `plugins/securityHeaders.js` | Low | Passive |

### Scan Modes

| Mode | Deskripsi |
|------|-----------|
| Passive | Hanya cek security headers (tanpa payload) |
| Active | SQLi, XSS, SSRF, Open Redirect |
| Aggressive | Semua plugin aktif |

### Frontend

| Fitur | Teknologi |
|-------|-----------|
| Dashboard + Risk Gauge | Chart.js |
| Scanner Panel | Tailwind CSS |
| HTTP Interceptor UI | HTML/CSS |
| Results Table | HTML/CSS |
| Dark Mode | Tailwind CSS |

---

## 🚀 Instalasi

```bash
# Clone repository
git clone https://github.com/sigmaboysigmaboy888-prog/Vs-x.git
cd Vs-x

# Install dependencies
npm install

# Jalankan server
npm start
```

Buka http://localhost:3000

---

🎮 Cara Penggunaan

1. Scan Target

1. Buka http://localhost:3000
2. Klik tab Scanner
3. Masukkan target (contoh: http://testphp.vulnweb.com)
4. Pilih mode: Passive / Active / Aggressive
5. Klik Start Scan
6. Pantau progress dan logs

2. HTTP Interceptor

1. Klik tab Interceptor
2. Pilih method (GET/POST/PUT/DELETE)
3. Masukkan URL
4. Isi headers (format JSON)
5. Klik Send Request

3. Download Report

Setelah scan selesai, klik Download HTML Report

---

📁 Struktur Proyek

```
Vs-x/
├── core/
│   ├── pipeline.js       # 6-phase orchestration
│   ├── crawler.js        # Puppeteer crawler
│   ├── mapper.js         # Attack surface mapping
│   ├── scanner.js        # Plugin manager
│   ├── riskEngine.js     # Risk scoring
│   └── interceptor.js    # HTTP capture/replay
├── plugins/
│   ├── sqli.js
│   ├── xss.js
│   ├── ssrf.js
│   ├── openRedirect.js
│   └── securityHeaders.js
├── frontend/
│   ├── index.html
│   └── app.js
├── server.js
├── package.json
└── vsx.png
```

---

🔌 API Endpoints

Endpoint Method Fungsi
/api/status/:scanId GET Cek progress
/api/replay POST Replay request
/api/plugins GET List plugin
ws://localhost:3000 WebSocket Real-time updates

---

⚠️ Keterbatasan (Jujur)

Batasan Keterangan
Subdomain wordlist Hanya 6 entry (bisa ditambah manual)
Tidak support login/auth Perlu session handling
Single thread Node.js default
Crawler terbatas Basic JavaScript only
Tidak ada CSRF detection Belum diimplementasikan
Tidak ada database Hanya simpan ke JSON file

---

🧪 Target Testing (Legal)

· http://testphp.vulnweb.com
· http://testhtml5.vulnweb.com

⚠️ Hanya gunakan pada sistem yang memiliki izin.

---

📄 Lisensi

MIT License

---

<div align="center">

⭐ Star repo ini jika bermanfaat ⭐

</div>
