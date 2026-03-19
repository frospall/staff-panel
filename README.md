<h1 align="center">
  <br>
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Roblox_Logo_2022.svg/1024px-Roblox_Logo_2022.svg.png" alt="Roblox" width="200">
  <br>
  Staff Panel Professional Edition 
  <br>
</h1>

<h4 align="center">An ultra-premium, heavily optimized web administration dashboard built for massive Roblox communities.</h4>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#roblox-sync">Roblox Sync API</a> •
  <a href="#credits">Credits</a>
</p>

---

## ⚡ Features

This Staff Panel is meticulously designed using Vanilla JS and Node.js for zero overhead and maximum performance.

*   **Ultimate Monochromatic VIP Aesthetic**: Pure CSS hardware-accelerated parallax starfield, frosted glass panels, and sub-pixel perfect animations (`cubic-bezier(0.16, 1, 0.3, 1)`).
*   **Live Game Synchronization**: Push active player counts, online staff members, and live player-submitted reports directly from your Roblox Game to the Web Dashboard.
*   **Enforcement Pipeline**: Comprehensive Action Modal allowing you to easily log rapid Ban, Warn, Kick, Mute, and Economy adjustment executions.
*   **Real-time Mod Logs & Reports**: Keep track of every staff action taken with built-in audit trails.
*   **Role Hierarchy System**: Native support for Moderator, Administrator, Management, and Staff Manager roles with respective permission barriers.

## 🛠 Installation

To host the Staff Panel locally or on a VPS (like Ubuntu, Railway, or Heroku):

1. **Clone the repository**
```bash
git clone https://github.com/frospall/staff-panel-pro.git
cd staff-panel-pro
```

2. **Setup the Database**
Clone `database.example.json` and rename it to `database.json`. This acts as your lightweight JSON data store.
```bash
cp database.example.json database.json
```
*Note: The default `database.example.json` contains a pre-approved `staff manager` account.*

3. **Install Dependencies & Run**
```bash
npm install
npm start
```
The panel will instantly boot up on `http://localhost:3000`.

## 🔗 Roblox Sync Integration

This panel connects seamlessly to your Roblox Game via an external `HttpService` API endpoint.

Inside `server.js`, you'll find the webhook routes: Let your Roblox `ServerScriptService` send standard JSON payloads to `/api/roblox/sync` and `/api/roblox/report` using `HttpService:PostAsync()`. Provide your matching `SECRET_KEY` and the stats will update live dynamically for all logged-in web staff.

## 👨‍💻 Credits
Architected and developed by [Frospall](https://github.com/frospall) - Executive Staff Manager & Senior Developer.
