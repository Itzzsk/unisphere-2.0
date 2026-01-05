# Unisphere  
**Anonymous Campus Interaction Platform**  
_Final Year Project – BCA_

---

## Project Overview

**Unisphere** is a web-based anonymous campus interaction platform developed as a **final year BCA project**.  
The application allows users to post **text and images anonymously**, enabling open expression and community interaction without revealing identity.

The project demonstrates the application of **full-stack web development concepts**, **privacy-first design**, and **basic content moderation** in a real-world context.

---

## Problem Statement

In college environments, students often hesitate to share opinions, feedback, or ideas due to:
- Fear of judgment
- Identity-based bias
- Social pressure

Most existing platforms require user authentication, which discourages honest participation.

**Unisphere** addresses this issue by eliminating user identity while still enabling structured interaction and moderation.

---

## Objectives

- Design an anonymous posting system without user authentication  
- Enable posting of text and image content  
- Allow engagement through likes and comments  
- Implement admin-controlled content moderation  
- Develop a responsive and mobile-friendly web application  
- Apply full-stack concepts learned during the BCA curriculum  

---

## Key Features

### 📝 Anonymous Posting
- Users can submit text or image posts without login
- No usernames or personal identifiers stored

### ❤️ Community Interaction
- Like and comment on posts
- Engagement without identity disclosure

### 🧭 Feed Structure
- **For You:** Curated academic notices and highlights  
- **Explore:** Anonymous community posts

### 🛡️ Admin Moderation
- Admin approval before post publication
- Ability to remove inappropriate content
- Controlled and safe environment

### 📱 Mobile-Friendly & PWA Support
- Responsive design for mobile devices
- Progressive Web App features (installable & offline support)
- Converted into Android APK using WebView

---

## System Architecture

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js, Express.js  
- **Database:** MongoDB  
- **Media Storage:** Firebase / Cloudinary  
- **Deployment:** Netlify (Frontend), Node.js Server  

---

## Project Structure

unisphere/
├── models/
│ └── moderation.js # Backend moderation logic
│
├── public/
│ ├── index.html # Main feed (anonymous posts)
│ ├── upload.html # Anonymous post submission
│ ├── style.css # Application styling
│ ├── script.js # Frontend logic (posts, likes, comments)
│ ├── manifest.json # PWA configuration
│ ├── sw.js # Service Worker for offline support
│ └── uni1.jpg # Static asset
│
├── firebase-config.js # Firebase configuration
├── server.js # Backend server entry point
├── netlify.toml # Deployment configuration
├── package.json # Project dependencies
├── package-lock.json
└── .gitignore


---

## Data & Privacy Design

- No user authentication or profiles  
- No personal data collection  
- Only post content, timestamps, likes, and comments are stored  
- Designed with **privacy-first principles**

---

## Learning Outcomes

This project strengthened understanding of:
- Full-stack web application development  
- REST API design  
- Database schema design  
- Anonymous data handling  
- Content moderation logic  
- Deployment and hosting workflows  

---

## Scope & Limitations

### Scope
- College-level usage  
- Anonymous content sharing  
- Admin-controlled moderation  

### Limitations
- No user personalization or history
- Manual moderation required
- Limited scalability for very large user bases

---

## Future Enhancements

- Automated moderation using AI/ML
- Topic-based post categorization
- Improved scalability and performance
- Analytics dashboard for engagement insights

---

## Academic Information

- **Project Type:** Final Year BCA Project  
- **Developed By:** Skanda Umesh  
- **Institution:** _(Add your college name)_  
- **Academic Year:** _(Add academic year)_  

---

## Declaration

This project was developed as part of the BCA curriculum and represents original work carried out for academic purposes.
