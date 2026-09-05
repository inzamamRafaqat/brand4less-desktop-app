# 🛍️ OmniRetail — Universal Customizable Retail ERP & POS Suite

OmniRetail is an enterprise-grade, multi-industry, white-label Retail Management & POS Platform engineered for **any retail business or organization** (Supermarkets, Pharmacies, Apparel & Fashion, Mobiles & Electronics, Footwear, Department Stores, Hardware & Tools).

---

## 🌟 Key Features

- **🧩 Dynamic Custom Product Schema Studio**: Store owners can define custom attributes (Size, Color, Batch No., Expiry Date, IMEI/Serial, UOM, Fabric, Warranty) without writing code.
- **🏢 1-Click Industry Presets**: Instant preconfigured attributes & category trees for Fashion, Pharmacy, Supermarket, Electronics, Footwear, and General Retail.
- **📊 Universal Dynamic Excel/CSV Importer**: Interactive visual column mapper to import spreadsheets from any vendor with automatic Moving Weighted Average Cost (WAC) calculations.
- **⚡ Universal Point of Sale (POS) Terminal**: High-speed checkout with SpeedX hardware barcode scanner listener, multi-tender payments (Cash, Card, Raast/IBFT, Khata Credit), and thermal receipt printing.
- **🖨️ Native Hardware Drivers**:
  - Direct **TSPL** raw command generation for TSC Label Printers
  - Direct **ESC/POS** raw command generation for DTS Thermal Receipt Printers (with auto paper cut and cash drawer kick)
  - Universal **SpeedX** USB HID barcode scanner keystroke interception with synthesized audio confirmation beeps
- **💼 Double-Entry Accounting & Khata CRM**: Customer purchase history drawer, customer/supplier Khata ledgers, payment vouchers, daily petty cash, monthly overheads, and staff payroll register.
- **📈 Real-Time Financial Analytics**: Trading Profit & Loss (P&L) statement based on Moving WAC COGS and live stock valuation audit.
- **🔒 Hot SQLite Backups**: Atomic `VACUUM INTO` snapshots without interrupting store operations.

---

## 🚀 Getting Started

### 1. Install & Link Dependencies
```bash
npm install
```

### 2. Start OmniRetail Suite
```bash
# Start both Backend (Port 4001) and Frontend UI (Port 5174) concurrently:
npm run dev
```

### 3. Access URLs
- **Frontend POS & Store UI**: `http://localhost:5174/`
- **Backend API Engine**: `http://127.0.0.1:4001/`

### 🔑 Default Logins & PINs
| Role | Username | Password | Quick Numpad PIN |
| :--- | :--- | :--- | :---: |
| **Admin (Owner)** | `admin` | `admin123` | **`9999`** |
| **Store Manager** | `manager` | `manager123` | **`5555`** |
| **Sales Cashier** | `cashier1` | `cashier123` | **`1234`** |

---

## 🧪 Automated Testing
```bash
npm test
```
All 10 test suites covering Moving WAC, multi-currency formatting, invoice calculations, dynamic schema validation, and hardware drivers pass at 100%.

---

## 📄 License
MIT © Inzamam Rafaqat
