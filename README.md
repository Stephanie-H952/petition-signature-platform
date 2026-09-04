# Petition Signature Platform

A full-stack petition signature collection platform built to help organizers collect names, emails, optional messages, and handwritten digital signatures through a simple web form.

The project is designed around a real advocacy workflow: users can sign a petition in the browser, the backend stores signature metadata, handwritten signatures are uploaded as image files, and an admin can review, delete, and export collected signatures.

## Project Idea

Many small organizations, student groups, and community campaigns need a lightweight way to collect petition support online. Generic form tools can capture text, but they often do not support handwritten signatures, custom storage, admin workflows, or export formats that are easy to share.

This project explores a custom petition platform with:

- A browser-based signature pad using HTML Canvas
- A Node.js and Express API for handling submissions
- AWS S3 for storing signature images
- AWS DynamoDB for storing signer metadata
- Admin-only access for reviewing, deleting, and exporting signatures
- Excel export support for offline review and reporting

## Features

- Public petition signing form
- Name, email, optional message, and handwritten signature capture
- Signature image upload to AWS S3
- Signature metadata storage in AWS DynamoDB
- Live signature count endpoint
- Admin login using a server-side password
- Admin list view for submitted signatures
- Admin delete endpoint that removes both metadata and signature images
- XLSX export with signature images embedded in the spreadsheet
- Environment-based configuration so secrets are not hardcoded

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Signature input | HTML Canvas API |
| Backend | Node.js, Express.js |
| Cloud storage | AWS S3 |
| Database | AWS DynamoDB |
| File export | ExcelJS |
| IDs | UUID |
| Configuration | Environment variables |
| Version control | Git and GitHub |

## How It Works

1. A visitor enters their name, email, optional message, and draws a signature in the browser.
2. The frontend converts the canvas signature into a PNG data URL.
3. The Express backend receives the form submission through `/api/sign`.
4. The backend uploads the PNG signature image to AWS S3.
5. The backend stores the signer metadata and S3 image key in DynamoDB.
6. The public page can request `/api/count` to show the total number of signatures.
7. An admin can use protected endpoints to review, delete, or export signatures.

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/sign` | Submit a new petition signature |
| `GET` | `/api/count` | Get the total number of signatures |
| `GET` | `/api/admin/signs` | Admin-only list of signatures |
| `DELETE` | `/api/admin/signs` | Admin-only delete for a signature record |
| `GET` | `/api/admin/export` | Admin-only XLSX export |
| `GET` | `/health` | Basic server health check |

## Security and Configuration

Sensitive values are loaded from environment variables instead of being hardcoded in the source code.

Required configuration:

```bash
AWS_REGION=us-east-2
DYNAMO_TABLE=your-dynamodb-table-name
S3_BUCKET=your-s3-bucket-name
ADMIN_PASSWORD=replace-with-a-long-random-password
```

The repository includes `.env.example` as a safe template. Real `.env` files and private key files are ignored by Git.

## Run Locally

Install dependencies:

```bash
npm install express aws-sdk uuid exceljs
```

Create a local `.env` file based on `.env.example`, then start the server:

```bash
node server.js
```

Open the app at:

```text
http://localhost:3000
```

## Project Structure

```text
.
|-- index.html       # Petition form and admin controls
|-- style.css        # Page styling
|-- script.js        # Frontend form, canvas, and admin interactions
|-- server.js        # Express API, AWS integration, and export logic
|-- .env.example     # Safe environment variable template
`-- .gitignore       # Ignores local secrets and generated files
```

## What This Project Demonstrates

- Building a full-stack JavaScript application
- Designing REST API endpoints for a practical user workflow
- Integrating browser Canvas with backend image storage
- Using AWS services for persistence and file storage
- Handling admin-only operations and server-side configuration
- Exporting structured data into a business-friendly spreadsheet format
- Keeping sensitive values out of source control

## Future Improvements

- Add user authentication for the admin dashboard
- Add input validation and stronger email validation
- Add rate limiting and request size limits
- Add automated tests for API endpoints
- Add a deployment guide for AWS, Render, Railway, or EC2
- Improve the admin UI with search and filtering
- Add pagination for large signature collections
- Add a `package.json` for easier dependency installation
