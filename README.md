# 3DPricey

A professional 3D printing price calculator and quote management tool by **Printel**. **3DPricey** allows users to calculate costs for both FDM and Resin printing, manage materials and machines, and track quotes.

## 🚀 Phase 1: Infrastructure Complete

Phase 1 introduces a complete cloud-ready architecture:
- ✅ Backend API (Express.js + TypeScript)
- ✅ PostgreSQL database with Prisma ORM
- ✅ Docker Compose orchestration
- ✅ Redis caching
- ✅ MinIO file storage (S3-compatible)
- ✅ JWT authentication
- ✅ Background sync with conflict resolution

**See [PHASE1-README.md](PHASE1-README.md) for setup instructions.**

## Features

- **Dual Technology Support**: Separate calculators for FDM (Filament) and Resin (SLA/DLP) printing.
- **Smart Auto-Fill**: Upload G-code (`.gcode`, `.3mf`) or Resin files (`.cxdlpv4`) to automatically extract print time, weight, and volume.
- **Thumbnail Previews**: Visual preview of uploaded 3D files.
- **Inventory Management**: Track costs for Filaments, Resins, and Consumables (gloves, IPA, etc.).
- **Machine Presets**: Store hourly rates and specifications for multiple printers.
- **Quote Dashboard**: Save, view, and export past quotes.
- **Responsive Design**: Built with a mobile-first approach using Shadcn UI.
- **Cross-Platform**: Available as a web app and a Desktop application (via Electron).

## License

This project is proprietary software owned by Printel. All rights reserved.

Unauthorized copying, modification, or distribution is prohibited.

For licensing inquiries, please contact Printel.

---

Made by Printel
