# 📘 Brand 4 Less Desktop Retail Suite — Complete User Manual

Welcome to the **Brand 4 Less Desktop Retail Suite**. This manual is designed for store owners, retail managers, cashiers, and inventory staff. It provides clear, step-by-step instructions for everyday retail store operations and hardware configuration.

---

## 📑 Table of Contents
1. [Getting Started & Login](#1-getting-started--login)
2. [Hardware Setup & Configuration (Printers & Scanner)](#2-hardware-setup--configuration)
   - [🏷️ TSC Brand Label Printer](#-tsc-brand-label-printer-setup)
   - [🧾 DTS Brand POS Thermal Receipt Printer](#-dts-brand-pos-thermal-receipt-printer-setup)
   - [⚡ SpeedX Barcode Scanner](#-speedx-barcode-scanner-setup)
3. [POS Billing Terminal (Day-to-Day Cashier Guide)](#3-pos-billing-terminal-guide)
4. [Customer Records, History & Khata Credit](#4-customer-records--khata-credit)
5. [Product Inventory & Barcode Generation](#5-product-inventory--barcodes)
6. [Purchases & Supplier Invoices](#6-purchases--supplier-management)
7. [Operating Expenses & Staff Payroll](#7-operating-expenses--staff-payroll)
8. [Financial Analytics & Profit/Loss Reports](#8-financial-analytics--profitloss)
9. [Database Backups & Safety](#9-database-backups--system-safety)
10. [Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. Getting Started & Login

### Starting the Application
1. Turn on your store PC.
2. Launch **Brand 4 Less** by double-clicking the application icon on your Windows Desktop.
3. You will see the **Lock Screen / Login Page**.

### User Roles & Default Logins
| Role | Access Level | Default Username | Default PIN | Default Password |
| :--- | :--- | :--- | :--- | :--- |
| **Admin (Owner)** | Full system control, financial P&L, backups, staff settings | `admin` | `9999` | `admin123` |
| **Store Manager** | Inventory, purchases, customer credit, daily reports | `manager` | `5555` | `manager123` |
| **Cashier / Staff** | POS Billing, barcode scanning, receipt printing, customer lookup | `cashier1` | `1234` | `cashier123` |

> 💡 **Quick Login Tip**: Cashiers can simply type their **4-digit PIN** on the numpad for instant 1-second login during busy store hours!

---

## 2. Hardware Setup & Configuration

This software comes pre-integrated with your store's physical hardware: **TSC Label Printer**, **DTS Thermal Receipt Printer**, and **SpeedX Barcode Scanner**.

```
   ┌────────────────────────────────────────────────────────┐
   │                  Brand 4 Less Desktop                  │
   └───────────────────────────┬────────────────────────────┘
            ▲                  │                  ▲
            │ (USB Scan)       │ (TSPL Print)     │ (ESC/POS Print)
            │                  ▼                  ▼
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │ SpeedX Laser  │  │  TSC TE200 /  │  │  DTS Thermal  │
    │  1D/2D Reader │  │ Label Printer │  │Receipt Printer│
    └───────────────┘  └───────────────┘  └───────┬───────┘
                                                  │ (RJ11 Cable)
                                                  ▼
                                          ┌───────────────┐
                                          │ Cash Drawer   │
                                          └───────────────┘
```

---

### 🏷️ TSC Brand Label Printer Setup
*(Compatible models: TSC TE200, TTP-244 Pro, DA210, TC200, MB240, and all TSPL printers)*

#### Physical Installation:
1. Connect the power cable to the TSC printer and wall outlet.
2. Connect the **USB cable** from the back of the TSC printer into your Windows computer.
3. Install your roll of **50mm x 30mm** (or 40mm x 25mm) sticky barcode labels:
   - Lift the top cover.
   - Place the label roll onto the roll holder.
   - Feed the labels through the green media guides until the label edge sticks out slightly from the front tear bar.
   - Close the lid firmly until both sides click.
4. Turn ON the power switch on the TSC printer.

#### Calibration (Do this whenever you insert a new label roll):
1. With the printer turned OFF, press and hold the **FEED button**.
2. Turn ON the power switch while still holding the **FEED button**.
3. Release the button when the printer starts feeding labels. The printer will automatically measure the label gap and stop at the exact edge.

#### Software Configuration in Brand 4 Less:
1. In the left sidebar, click **`Settings & Backups`** ➔ Click the **`Hardware (TSC, DTS, SpeedX)`** tab.
2. Under **TSC Label Printer**, your connected TSC printer will appear in the **Target TSC Device** dropdown.
3. Click **`[Test TSC Label Printer]`**.
   - The printer will immediately print a crisp sample barcode test label: *"Brand 4 Less - Classic Cotton Polo Shirt (PKR 1,850)"*.

#### How to Print Barcodes in Daily Work:
- Go to **`Product Inventory`** ➔ Click **`Print Barcode Labels`** on any item or select multiple products.
- Click **`[⚡ Direct Print (TSC)]`** for instant sticker printing, or click **`[Download PDF]`** to save a PDF sheet.

---

### 🧾 DTS Brand POS Thermal Receipt Printer Setup
*(Compatible models: DTS POS-80, DTS POS-58, Epson ESC/POS, Xprinter, Rongta)*

#### Physical Installation:
1. Connect the power brick to the DTS printer and wall outlet.
2. Connect the **USB Cable** from the DTS printer to your Windows PC.
3. Connect the **RJ11 telephone-style cable** from your Cash Drawer into the back port of the DTS printer marked **DK / Drawer**.
4. Open the printer cover, insert the **80mm thermal paper roll** (ensure the paper feeds from underneath), and close the lid with a few inches sticking out.
5. Turn ON the power switch.

#### Software Configuration in Brand 4 Less:
1. Open **`Settings & Backups`** ➔ Click **`Hardware (TSC, DTS, SpeedX)`** tab.
2. Under **DTS Thermal Receipt Printer**, select your DTS printer from the dropdown.
3. Ensure **Kick Cash Drawer** and **Auto Paper Cut** are checked.
4. Click **`[Test DTS Receipt Printer]`**.
   - The printer will print a test receipt and automatically pop open the cash drawer!

#### How Receipts Print during Checkout:
- When the cashier completes a sale in the POS Billing Terminal:
  1. The cash drawer opens automatically (for Cash sales).
  2. The DTS thermal receipt preview appears.
  3. Click **`[⚡ Direct Print (DTS Thermal)]`** — the receipt prints in under 1 second and the paper cutter cuts the receipt cleanly!

---

### ⚡ SpeedX Barcode Scanner Setup
*(Compatible models: SpeedX Laser 1D, SpeedX 2D Barcode & QR Readers)*

#### Physical Installation:
1. Plug the SpeedX USB cable into any free USB port on your Windows PC.
2. Windows will automatically recognize the device within 3 seconds (no driver disk required).

#### How SpeedX Scanner Works in the App:
- **Zero-Click Global Detection**:
  - The cashier does **NOT** need to click on any search box with the mouse.
  - Simply point the SpeedX scanner at any clothing tag, barcode sticker, or shoe box.
  - Press the scanner trigger button.
- **What Happens Automatically**:
  1. The system detects the scanned barcode in under 20 milliseconds.
  2. A pleasant confirmation **BEEP** sounds from the speakers.
  3. The exact item is added to the active cart.
  4. If the item is already in the cart, the quantity increases by 1.
  5. A green notification badge displays at the top: *"SpeedX Scanned & Added: Denim Jeans (B4L-DNM-01)"*.

#### Scanner Testing:
- Open **`Settings & Backups`** ➔ **`Hardware`** tab.
- Click into the **Live Hardware Scanner Test** box and scan any item with your SpeedX scanner to see real-time decoding confirmation.

---

## 3. POS Billing Terminal Guide

The POS terminal is built for speed during busy retail store hours.

```
┌──────────────────────────────────────────────┬──────────────────────────────┐
│  PRODUCT CATALOG & SEARCH                    │  ACTIVE BILLING CART         │
│  [Search or Scan SpeedX Barcode...        ]  │  • Customer Name: [Usman   ] │
│                                              │  • Phone Number : [0300... ] │
│  [All Products] [Men] [Women] [Accessories]  │  ─────────────────────────── │
│                                              │  1. Polo Shirt (M)   PKR 1800│
│  ┌────────────┐ ┌────────────┐ ┌───────────┐ │  2. Chino Pant (32)  PKR 2400│
│  │ Polo Shirt │ │ Chino Pant │ │ Denim Jkt │ │  ─────────────────────────── │
│  │ Size: S M L│ │ Size: 30 32│ │ Size: L XL│ │  Subtotal:          PKR 4200│
│  │ PKR 1,800  │ │ PKR 2,400  │ │ PKR 3,800 │ │  Discount:          -PKR  200│
│  └────────────┘ └────────────┘ └───────────┘ │  GRAND TOTAL:       PKR 4000│
│                                              │  [ F4 - COLLECT PAYMENT    ] │
└──────────────────────────────────────────────┴──────────────────────────────┘
```

### ⌨️ Cashier Keyboard Shortcuts:
| Key | Action |
| :--- | :--- |
| **`F1`** | Focus Search Box |
| **`F4`** | Collect Payment & Open Checkout |
| **`F8`** | Hold Active Cart (when customer steps aside to pick another item) |
| **`ESC`** | Cancel / Close active popup modal |

### Completing a Sale Step-by-Step:
1. **Add Items**: Scan tags using the **SpeedX Barcode Scanner** or click on products from the grid.
2. **Customer Info (Auto-Registration)**:
   - In the top right of the cart, type the customer's **Name** and **Mobile Phone Number** (e.g. `Usman Tariq`, `03001234567`).
   - If the customer visited before, suggestions will pop up automatically!
3. **Apply Discounts (Optional)**:
   - Click **`Add Discount`** to enter a flat amount (e.g. `PKR 200 off`) or percentage (`10% off`).
4. **Collect Payment**:
   - Press **`F4`** or click **`Collect Payment`**.
   - Choose payment method:
     - **Cash**: Enter amount tendered (e.g. `5000`) ➔ system calculates change to return.
     - **Card / POS Machine**: For credit/debit card swipe.
     - **Bank Transfer (IBFT)**: For online banking/Raast transfers.
     - **Khata (Credit)**: Charges the amount to the customer's account (requires customer profile).
     - **Split Payment**: e.g. Customer pays PKR 2,000 in Cash and PKR 2,000 on Card.
5. **Print Receipt**:
   - Click **`Confirm & Print Receipt`**.
   - The cash drawer opens and the DTS receipt printer prints the receipt!

---

## 4. Customer Records & Khata Credit

The **Customer Records** page tracks your store's customer database and purchasing history.

### What You Can Do in Customer Records:
- **View Lifetime Customer Purchases**: Click **`History`** on any customer row to see all previous invoices they ever purchased, what items they bought, and reprint their thermal receipt anytime.
- **Khata Ledger (Credit Accounts)**:
  - Customers with an active credit balance are highlighted with an amber badge.
  - To record a customer payment when they return to clear their debt:
    1. Go to **`Customer Khata`** in the sidebar.
    2. Click **`Record Payment`**.
    3. Enter the amount received (e.g. `PKR 5,000`) and payment method (`Cash` or `Bank Transfer`).
    4. Print a signed Payment Receipt Voucher for the customer!
  - Export complete account statements to **PDF** or **Excel** with one click.

---

## 5. Product Inventory & Barcodes

### Adding a New Garment / Product:
1. Click **`Product Inventory`** in the sidebar ➔ Click **`+ Add New Product`**.
2. Enter **Product Name** (e.g. *Slim Fit Denim Jeans*), choose **Category** (e.g. *Denim & Bottoms*), and select **Brand / Origin**.
3. In the **Variants Table**, add sizes and colors:
   - e.g. `Navy / 30`, `Navy / 32`, `Navy / 34`, `Black / 32`.
   - Enter **Cost Price (PKR)** (your purchase price) and **Retail Selling Price (PKR)**.
   - Enter initial **Stock Quantity**.
4. Click **`Save Product & Generate SKUs`**. The system automatically generates unique barcodes and internal SKUs!

### Printing Barcodes with TSC Printer:
1. On any product in the inventory, click **`Print Barcode Labels`**.
2. Select your layout:
   - **Thermal Roll (50x30mm)** (for your TSC Label Printer).
   - **A4 Sheet (3x8 Grid)** (for standard sticky sheets).
3. Select print quantity (e.g. `Match Stock Quantities` to print a sticker for every unit in stock).
4. Click **`[⚡ Direct Print (TSC)]`** to send the labels straight to the TSC printer, or click **`[Download PDF]`** to save a vector PDF file.

---

## 6. Purchases & Supplier Management

When you receive a new consignment/stock shipment from a vendor or manufacturer:

1. Go to **`Purchases & Invoices`** ➔ Click **`+ New Purchase Order`**.
2. Select the **Supplier** (or create a new one).
3. Add the items, quantities received, and invoice unit cost.
4. Enter the amount paid today (e.g. partial payment) and remaining unpaid balance.
5. Attach a photo or PDF of the supplier's paper bill (optional).
6. Click **`Receive & Ingest Inventory`**.
   - **Automatic WAC Costing**: The system automatically recalculates the **Moving Weighted Average Cost (WAC)** for each variant so your profit margins remain 100% accurate!

---

## 7. Operating Expenses & Staff Payroll

Keep your store operating expenses cleanly categorized so your Net Profit reports are accurate:

### Recording Daily Expenses:
- Click **`+ Record Daily Expense`** in the top action bar.
- Choose category: *Petty Cash, Tea & Refreshments, Generator Fuel, Shop Packaging Bags, etc.*
- Enter amount and notes (e.g. *Store shopping bags 500 pcs - PKR 2,500*).

### Recording Monthly Overhead Bills:
- Click **`+ Record Monthly Expense`**.
- Select the **Billing Month** (e.g. `September 2026`).
- Choose category: *Shop Rent, LESCO / K-Electric Electricity Bill, Internet & Software, Security & Maintenance*.
- Enter bill reference number and amount.

### Staff Payroll & Salaries:
1. Switch to the **Staff Payroll & Salaries** tab.
2. Click **`+ Add New Staff Member`** to register cashiers, floor sales assistants, or managers with their monthly base salary and CNIC.
3. At the end of the month, click **`Disburse / Pay Salary`** to record salary payouts (with bonuses or deductions), which automatically posts into the expense ledger.

---

## 8. Financial Analytics & Profit/Loss (P&L)

Go to **`Financial Analytics`** in the sidebar to review your business financial health:

### 1. Profit & Loss (P&L) Statement:
- **Net Revenue**: Gross Sales minus Customer Discounts.
- **Cost of Goods Sold (COGS)**: Exact cost of items sold calculated at Moving WAC.
- **Gross Trading Profit**: Revenue minus COGS (+ Gross Margin %).
- **Operating Expenses**: Rent, electricity, staff payroll, packaging, fuel.
- **Net Operating Profit**: Real bottom-line take-home profit.
- Click **`[Export Statement to Excel]`** to download the official spreadsheet report.

### 2. Inventory Valuation (WAC Basis):
- Shows total units in stock across all categories.
- Total capital tied up in inventory at cost price.
- Gross realizable value at retail selling price.
- Unrealized potential profit margin.

### 3. Sales & Margin Transactions:
- Audit trail of all sales transactions, cashier performance, and payment breakdown.

---

## 9. Database Backups & System Safety

Your data is stored locally in an offline-first **SQLite Database** with full ACID transactional integrity.

### How to Create a Snapshot Backup:
1. Go to **`Settings & Backups`** ➔ Click **`Database Backup & Restore`** tab.
2. Click **`Create Backup Now`**.
3. A hot transactional SQLite snapshot (e.g. `brand4less_backup_2026-09-02.db`) is created in the `data/backups/` directory within 1 second.
4. Click **`Download`** to save a copy onto a USB Flash Drive or external hard drive for safe keeping!

---

## 10. Troubleshooting & FAQ

### Q1: The SpeedX Barcode Scanner is connected, but nothing happens when scanning.
- **Solution**:
  1. Ensure the USB cable is firmly plugged in. The SpeedX scanner should emit a power-on chime.
  2. Point the scanner at any text editor (like Notepad) and scan a barcode. If the numbers appear followed by an enter line, the scanner is working correctly.
  3. In the app, make sure you are on the **POS Billing Terminal** page. Scanned items will be added to the cart automatically.

### Q2: The TSC Label Printer is skipping blank labels or printing across the gap.
- **Solution**:
  - The printer needs gap calibration. Turn OFF the printer. Hold the **FEED button** and turn the printer ON. Release the button when the printer feeds 2-3 labels. The green light will turn solid green, indicating proper calibration.

### Q3: The DTS Thermal Receipt Printer is not opening the Cash Drawer.
- **Solution**:
  1. Ensure the RJ11 cable is connected between the DTS printer's **DK** port and the cash drawer.
  2. In **Settings ➔ Hardware**, ensure **Kick Cash Drawer** is enabled.
  3. Click **`[Test DTS Receipt Printer]`** to test the pulse trigger.

### Q4: How do I access the software from another counter/PC in the store?
- **Solution**:
  - Any second billing PC or tablet connected to the same store Wi-Fi or Local Area Network (LAN) can connect directly to the main counter server PC to process sales concurrently.

---

**Brand 4 Less Retail Suite** — Developed for Enterprise Retail Performance.
