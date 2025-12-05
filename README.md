# Grade Speeder
*Canvas ~~Speed Grader~~ Grade Speeder &check;*

**High-efficiency Canvas LMS grading interface. Local full-stack app that proxies Canvas API requests. An alternative to Speed Grader.**
  
[github.com/jasonshaw0/](https://github.com/jasonshaw0)

- Built to speed up, enhance, and maximize grading efficiency with tools, optimizations, and a ridiculous amount of well-integrated features. 
Focus on quick (keyboard) navigation, minimal load times, optimizing workflows, and leaving hundereds of other functions at your fingertips, from quality-of-life improvements to game changing utilities. 
<br>
- Get through your pile before the heat death of the universe!
- **For people who grade Canvas courses. If that ain't you, take a hike.**

<img src="assets\image.png" alt="alt text" width="400">




**FERPA-Compliant. Student data stays local!**

## Setup
- It will be a web app soon so I didn't bother with packaging or installers.
#### Prerequisites are:
1. **Node.js 18+** 
2. **Canvas LMS access token**
- Setup for dev build is trivial. Ask chatgpt or something if you're one of the 6 people who's never used npm before.

### Install
 
 Clone repo → cd to folder:

```bash
# Backend 
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
# Just use two seperate terminal \(@_@)/
```
Served at http://localhost:5173. 
Backend is at http://localhost:4000.

### Configure Canvas API
1. Get token: Canvas → Account → Settings → New Access Token
   ...
2. (Run back/frontend obviously) Open http://localhost:5173
3. In the app find Settings → Connection tab
4. Enter:
   - **Base URL**: for USF it's `https://usflearn.instructure.com/api/v1'
   - **Course ID**: Get from URL of your course (ex. usflearn.instructure.com/courses/`1234567`.
   - **Access Token**: Paste token from step 1.
1. **IT TAKES A MINUTE TO LOAD THE FIRST TIME.** It's going to say invalid token and all that jazz until it fetches data so just wait.
---

## Features
Look, there's a lot. I got carried away.

- **Navigation**: Tabs, keyboard shortcuts, assignment picker, student search. The works.
- **Grading**: Inline grades, comments, rubric feedback, status dropdown, group grading. Stages everything before you commit.
- **PDF Viewer**: Lazy-loaded so it doesn't tank load times. Zoom, page nav, download.
- **Auto-save**: Drafts saved locally. Session restore optional. History log for when you inevitably forget what you did.
- **Settings**: Dark mode, name formats, comment box sizes, toast durations. More toggles than you'll ever touch.
- **Stats Panel**: Timer, progress bar, avg time per student. For the data nerds.

---

## Architecture

```
backend/   → Express proxy to Canvas API
frontend/  → React + Vite + Tailwind
```

Config lives in `backend/config.json` (gitignored). UI state in localStorage.

Bundle: ~80KB main, ~127KB PDF viewer (lazy).

---

## API Reference
| Method | Endpoint            | What it does              |
| ------ | ------------------- | ------------------------- |
| GET    | `/config`           | Get config (token masked) |
| POST   | `/config`           | Update credentials        |
| GET    | `/submissions`      | Fetch submissions         |
| POST   | `/submissions/sync` | Push changes to Canvas    |
| GET    | `/assignments`      | List assignments          |
