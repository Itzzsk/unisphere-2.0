<div align="center">

# Unisphere
### Anonymous Campus Interaction Platform
**Final Year Project – BCA**

![Version](https://img.shields.io/badge/version-2.0-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-complete-success?style=flat-square)


---

### Tech Stack

![HTML5](https://img.shields.io/badge/Frontend-HTML5_%7C_CSS3_%7C_JS-E34F26?style=flat-square)
![Node.js](https://img.shields.io/badge/Backend-Node.js_%7C_Express.js-339933?style=flat-square)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-4ea94b?style=flat-square)
![Firebase](https://img.shields.io/badge/Storage-Firebase-FFCA28?style=flat-square)
![Netlify](https://img.shields.io/badge/Deployment-Netlify-00C7B7?style=flat-square)

<br/>

**Unisphere** is a privacy-first web platform that enables students to share thoughts, feedback, and ideas without revealing their identity.
Designed to foster open expression while maintaining a safe, moderated community environment.

</div>

---

## 1. Project Overview

**Unisphere** addresses the social barriers in college environments—such as fear of judgment or identity bias—by eliminating user profiles entirely. It demonstrates the practical application of **full-stack web development**, **RESTful API design**, and **content moderation logic**.

### Key Objectives
* **Anonymity:** Design a posting system that requires no user authentication.
* **Engagement:** Enable likes, comments, and voting on anonymous entries.
* **Safety:** Implement admin-controlled moderation to filter inappropriate content.
* **Accessibility:** Ensure a responsive, mobile-first design with PWA capabilities.

---

## 2. System Architecture

The application follows a standard **MVC (Model-View-Controller)** architecture to ensure separation of concerns and scalability.

| Component | Technology Used | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML, CSS, JavaScript | Responsive UI with real-time DOM manipulation. |
| **Backend** | Node.js, Express.js | REST API handling requests, routing, and logic. |
| **Database** | MongoDB | NoSQL storage for posts, polls, comments, and engagement data. |
| **Storage** | Firebase / Cloudinary | Secure cloud storage for image uploads. |
| **Hosting** | Netlify / Render | Cloud deployment for static assets and server services. |

---

## 3. Key Features

### Core Functionality
* **Anonymous Posting:** Users can submit text or image posts without login. No personal identifiers (IP, Email, Username) are stored.
* **Interactive Polls:** Users can create and vote on anonymous polls to gauge campus opinion on various topics.
* **Community Interaction:** Real-time like and comment system allows engagement without identity disclosure.

### Administration & Security
* **Content Moderation:** A dedicated Admin Dashboard allows for the review and removal of flagged content before or after publication.
* **Privacy-First Design:** The database schema is intentionally designed to exclude user-identifiable data fields.

### Mobile Optimization
* **Responsive Design:** Fully fluid layout adapting to desktop, tablet, and mobile screens.
* **PWA Integration:** 'Add to Home Screen' functionality and offline support via Service Workers.
* **Android Compatibility:** Optimized for conversion into an Android APK using WebView.

---

## 4. Project Structure

```text
unisphere/
├── models/
│   ├── moderation.js        # Backend moderation logic & content safety
│   └── polls.js             # Poll schema and voting logic
│
├── public/                  # Frontend Client
│   ├── index.html           # Main feed UI (Anonymous posts & polls)
│   ├── upload.html          # Post submission interface
│   ├── style.css            # Global application styling
│   ├── script.js            # Frontend logic (DOM, API calls, interactions)
│   ├── manifest.json        # PWA configuration (Installability)
│   ├── sw.js                # Service Worker (Offline support & caching)
│   └── uni1.jpg             # Static assets
│
├── firebase-config.js       # Firebase SDK initialization & keys
├── server.js                # Express/Node.js backend entry point
├── netlify.toml             # Netlify build & deployment settings
├── package.json             # Project dependencies & scripts
├── package-lock.json        # Dependency version lock
└── .gitignore               # Ignored build files
````
---

## 5. Conclusion & Academic Details

###  Learning Outcomes
This project served as a comprehensive study in modern web development, specifically covering:
* **REST API Development:** Creating endpoints for GET, POST, and DELETE operations.
* **NoSQL Data Modeling:** Designing schemas for unstructured data (anonymous posts & polls).
* **Asynchronous JavaScript:** Managing API calls and frontend state updates.
* **Deployment Pipelines:** Configuring production environments on Netlify and Node.js servers.

<br/>

###  Academic Information

<div align="center">

| Field | Details |
| :--- | :--- |
| **Project Type** | Final Year BCA Project |
| **Developed By** | Skanda Umesh |
| **Institution** | [Insert College Name] |
| **Academic Year** | 2025 - 2026 |

</div>

<br/>

> **Declaration:** This project was developed as part of the **BCA curriculum** and represents original work carried out for academic purposes.
