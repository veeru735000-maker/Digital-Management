# Veerendra – Digital Document Management System

A professional, full-stack, enterprise-grade **Digital Document Management System** built with **HTML5, CSS3, JavaScript, Node.js, Express.js, and MySQL**.

Designed with security, speed, and clean modular architecture, this application allows users and organizations to securely store, categorize, preview, share, and manage digital files with fine-grained access control.

---

## 🌟 Key Features

### 1. User Authentication & Authorization
- **Registration & Login**: Secure account creation with email validation and role assignment (`user` / `admin`).
- **Cryptographic Security**: Salted password hashing via `bcryptjs`.
- **Session Management**: Server-backed session authentication (`express-session`) with secure HTTP-only cookies.
- **Route Guards**: Private pages and API endpoints are protected against unauthorized access with automated redirects.

### 2. Comprehensive Dashboard
- **Dynamic Metrics**: Live counters for Total Documents, Total Categories, Registered Users, and Shared Documents.
- **Visual Analytics**: Dynamic progress indicators showing document distribution across categories.
- **Quick Action Center**: One-click shortcuts for uploads, search, sharing, and category management.
- **Recent Repository Log**: Quick-access table displaying the most recently uploaded documents with direct view and download links.

### 3. Document Management
- **Multi-Format Uploads**: Supports **PDF, DOC, DOCX, JPG, and PNG** files with a maximum file size limit of 25 MB.
- **Drag-and-Drop Dropzone**: Modern user interface with animated drag-and-drop file selection and instant file metadata preview.
- **MIME & Extension Verification**: Dual-layer security filter powered by `multer` preventing unsafe uploads.
- **Search & Filter**: Real-time debounced title/filename search and category filtering.
- **Table & Grid Views**: Seamlessly switch between detailed data table and responsive card grid views.
- **In-Browser Document Preview**: View PDFs and high-resolution images inline directly within modal viewers.
- **Safe Downloads & Deletion**: Secure streaming downloads and cascade deletion removing records from MySQL and files from physical storage.

### 4. Category Management
- **Hierarchical Classification**: Organize documents into custom categories (e.g., *Academic Records*, *Financial & Legal*, *Official Identity*).
- **Document Count Tracking**: Dynamic SQL aggregation showing the number of documents associated with each category.
- **Full CRUD Controls**: Add, edit, view, and delete categories with safety warnings.

### 5. Multi-User Sharing & Access Control
- **Granular Permissions**: Share documents with any registered user with either **View Only** or **View & Download** rights.
- **Shared by Me**: Audit trail of all documents shared with other users, complete with instant permission revocation.
- **Shared with Me**: Centralized inbox of documents shared by peers, with enforced permission gates.
- **Server-Side Gatekeeper**: Endpoints verify ownership or granted permissions before allowing viewing or downloading.

---

## 📁 Project Directory Structure

```text
Digital_Document_Management/
│
├── app.js                   # Express application entry point & middleware
├── db.js                    # MySQL2 connection pool & auto-table initializer
├── package.json             # Project dependencies and npm scripts
├── schema.sql               # MySQL database schema and seed data
├── test.js                  # Automated test verification suite
├── .env                     # Local environment variables (Port, DB credentials)
├── .env.example             # Example configuration template
├── .gitignore               # Git ignore rules for node_modules and uploads
├── README.md                # Comprehensive project documentation
│
├── routes/
│   ├── authRoutes.js        # Authentication & user profile endpoints
│   ├── userRoutes.js        # Users CRUD endpoints (users table)
│   ├── documentRoutes.js    # Upload, download, view, search, and delete endpoints
│   ├── categoryRoutes.js    # Category CRUD and document count aggregation
│   └── accessRoutes.js      # Granular sharing, permissions, and revocation
│
├── uploads/                 # Local directory for uploaded physical files
│   └── .gitkeep
│
└── public/
    ├── index.html           # Landing page with feature showcase
    ├── login.html           # Modern sign-in portal
    ├── register.html        # User registration portal
    ├── dashboard.html       # Analytics dashboard (4 live MySQL cards)
    ├── users.html           # users table interface (search, add, edit, delete)
    ├── categories.html      # categories table interface (with document counts)
    ├── documents.html       # documents table interface (search, SQL JOIN, download)
    ├── access.html          # document_access table interface (permissions)
    ├── upload.html          # Drag-and-drop file uploader
    │
    ├── css/
    │   └── style.css        # Enterprise SaaS stylesheet (variables, responsive, dark/light)
    │
    └── js/
        └── script.js        # Modular client controller & API integration
```

---

## 🗄️ Database Architecture (`digital_document_db`)

The system uses 4 normalized MySQL tables with foreign key constraints:

### 1. `users` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for user |
| `name` | VARCHAR(100) | NOT NULL | User's full name |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | Account login email |
| `password` | VARCHAR(255) | NOT NULL | Bcrypt-hashed password |
| `role` | VARCHAR(20) | DEFAULT 'user' | Access level (`user` or `admin`) |

### 2. `categories` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `category_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for category |
| `category_name`| VARCHAR(100) | UNIQUE, NOT NULL | Name of the category |
| `description` | VARCHAR(255) | NULL | Purpose and scope of category |

### 3. `documents` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `document_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for document |
| `user_id` | INT | FOREIGN KEY (users.user_id) | Owner who uploaded the document |
| `category_id` | INT | FOREIGN KEY (categories.category_id) | Associated category (NULL on delete) |
| `title` | VARCHAR(150) | NOT NULL | Document title |
| `file_name` | VARCHAR(255) | NOT NULL | Original uploaded filename |
| `file_path` | VARCHAR(255) | NOT NULL | Safe sanitized filename on disk |
| `upload_date` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date and time of upload |
| `status` | VARCHAR(20) | DEFAULT 'Active' | Document state (`Active`, `Draft`, `Archived`) |

### 4. `document_access` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `access_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for permission record |
| `document_id` | INT | FOREIGN KEY (documents.document_id) | Shared document reference |
| `user_id` | INT | FOREIGN KEY (users.user_id) | Target recipient user reference |
| `permission` | VARCHAR(20) | NOT NULL (`view`/`download`) | Granted permission level |
| `granted_date`| DATETIME | DEFAULT CURRENT_TIMESTAMP | Date and time permission was granted |

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Modern SaaS Design), JavaScript (Vanilla ES6+), Font Awesome 6 |
| **Backend** | Node.js (Runtime), Express.js (REST Framework) |
| **Database** | MySQL 8.0, MySQL2 (Connection pooling with Promises) |
| **Authentication**| Express-Session (HTTP-only cookies), Bcryptjs (Salted hashing) |
| **File Handling**| Multer (Multipart/form-data with MIME validation) |
| **Configuration**| Dotenv (Environment variable isolation) |

---

## ⚙️ Installation & Setup Guide

### Step 1: Clone or Navigate to the Project Directory
```powershell
cd c:\Users\veerendra\OneDrive\Desktop\Digital_Document_Management
```

### Step 2: Install Node.js Dependencies
```powershell
npm install
```

### Step 3: Configure Environment Variables
Create or verify the `.env` file in the root folder with your database credentials:

```ini
PORT=5000
NODE_ENV=development
SESSION_SECRET=veerendra_doc_mgmt_super_secret_key_2026

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=veeru
DB_NAME=digital_document_db
```
*(Replace `veeru` with your MySQL root password if running on a different machine).*

---

## 🐬 MySQL Database Setup (Workbench / CLI)

You can set up the database using either **MySQL Workbench** or the **MySQL Command Line**.

### Method A: Using MySQL Workbench
1. Open **MySQL Workbench** and connect to your local MySQL instance.
2. Click **File** -> **Open SQL Script...** and select `schema.sql` located in `Digital_Document_Management/schema.sql`.
3. Click the **Execute (Lightning icon)** button to execute the entire script.
4. Refresh the **Schemas** panel on the left; you will see `digital_document_db` with all 4 tables created and populated with starter categories.

### Method B: Using MySQL Command Line
Run this command in your terminal / PowerShell:
```powershell
Get-Content schema.sql | mysql -u root -p
```
Enter your MySQL password when prompted.

---

## 🚀 Running the Application

### Start in Production / Standard Mode:
```powershell
npm start
```

### Start in Development Mode (Auto-reloads on file change):
```powershell
npm run dev
```

The console will display:
```text
=============================================================
  Veerendra - Digital Document Management System             
  Server is running at: http://localhost:5000             
  Environment: development       
=============================================================
[Database] Connected successfully to MySQL (localhost:3306/digital_document_db)
[Database] Schema verification completed.
```

Open your browser and navigate to:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 🧪 Testing the Application

### Automated Integration Test Suite
To verify database connectivity, password hashing, document uploading, search, dashboard stats, and granular document sharing, run:

```powershell
npm test
```

### Manual Testing Walkthrough:
1. **User Registration**:
   - Go to `http://localhost:5000/register.html`.
   - Register an Admin user (e.g., `Veerendra`, `veerendra@example.com`, role `Administrator`).
   - Register a second standard user (e.g., `Rahul`, `rahul@example.com`, role `User`).
2. **Dashboard Overview**:
   - Log in and verify live stat counters (Total Documents, Categories, Users, Shared Docs).
3. **Category Management**:
   - Go to `Categories` (`/categories.html`).
   - Create a new category, edit its description, and check document count indicators.
4. **Document Upload**:
   - Go to `Upload Document` (`/upload.html`).
   - Drag and drop a PDF, Word document, or image file.
   - Enter a title, choose a category, select status (`Active`), and click **Upload**.
5. **Document Search & Filtering**:
   - Go to `All Documents` (`/documents.html`).
   - Search by title or filename in real time.
   - Filter by category using the dropdown.
   - Switch between **Table View** and **Grid View**.
6. **In-Browser Preview & Download**:
   - Click the **Eye icon** to preview the PDF/image inline in the modal viewer.
   - Click the **Download icon** to download the exact file with its original name.
7. **Document Access Sharing**:
   - Click the **Share icon** next to your document or visit `/access.html`.
   - Select the second user (`Rahul`), assign permission (`View Only` or `View & Download`), and submit.
   - Log out and log in as `rahul@example.com`.
   - Verify the shared document appears under "Documents Shared With You" with matching permissions.
8. **Revoke Access**:
   - Log back into the owner account and click **Revoke** on `/access.html`. Access will immediately be terminated.
9. **Secure Deletion**:
   - Delete a document from `/documents.html`. Confirm deletion; the record is removed from MySQL and the file is deleted from the `uploads/` folder.

---

## 📤 GitHub Upload Instructions

To upload this complete project to GitHub:

### 1. Initialize Git Repository
```powershell
git init
```

### 2. Stage All Project Files
```powershell
git add .
```

### 3. Commit the Changes
```powershell
git commit -m "Initial commit: Veerendra - Digital Document Management System complete implementation"
```

### 4. Create a New Repository on GitHub
1. Open [GitHub](https://github.com) and click **New Repository**.
2. Name the repository: `Digital_Document_Management` (or your preferred name).
3. Leave it public or private, and do **not** check "Initialize with README" (since we already have one).
4. Copy the repository URL (e.g., `https://github.com/veeru735000-maker/Digital_Document_Management.git`).

### 5. Link Remote and Push
```powershell
git branch -M main
git remote add origin https://github.com/veeru735000-maker/Digital_Document_Management.git
git push -u origin main
```

---

## 🔒 Security Best Practices Implemented

- **Prepared SQL Statements**: All database operations use parameterized queries (`?`) via `mysql2/promise` to prevent SQL Injection attacks.
- **Salted Password Hashing**: Passwords are encrypted using `bcryptjs` with 10 salt rounds before saving to MySQL.
- **Session Protection**: Express sessions use `httpOnly: true` cookies, preventing cross-site scripting (XSS) cookie theft.
- **Input Validation**: Strict validation on email formats, password lengths, file MIME types, and file extensions.
- **Restricted Storage Access**: Direct directory browsing of `uploads/` is disabled; all file streams are gated behind authenticated permission checks.

---

## 👨‍💻 Project Developer
- **Developer**: Veerendra Kumar
- **GitHub**: [veeru735000-maker](https://github.com/veeru735000-maker)
- **Role**: Senior Full-Stack Web Developer
- **Academic Project**: Digital Document Management System

