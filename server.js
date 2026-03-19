const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const RANK_WEIGHTS = {
    'moderator': 1,
    'administrator': 2,
    'management': 3,
    'staff manager': 4
};
function getDb() {
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.error("Database read error. Using fallback.", e);
        return { users: [], logs: [], announcements: [], robloxStats: { playerCount: 0, activeStaff: 0, activeReports: 0 } };
    }
}
function saveDb(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Database write error:", e);
    }
}
function getUser(username, db) {
    if (!username) return null;
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
}
function getRankWeight(role) {
    return RANK_WEIGHTS[role] || 0;
}
function ensureStructure(db) {
    if(!db.logs) db.logs = [];
    if(!db.announcements) db.announcements = [];
    if(!db.reports) db.reports = [];
    return db;
}
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    let db = getDb(); db = ensureStructure(db);
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ username: user.username, role: user.role, status: user.status });
});
app.post('/api/auth/signup', (req, res) => {
    const { username, password } = req.body;
    let db = getDb(); db = ensureStructure(db);
    if (getUser(username, db)) return res.status(400).json({ error: 'Username already exists' });
    const newUser = { username, password, role: 'moderator', status: 'pending' };
    db.users.push(newUser);
    saveDb(db);
    res.status(201).json({ message: 'Signup successful.', user: newUser });
});
app.post('/api/admin/pending', (req, res) => {
    const { requester } = req.body;
    let db = getDb(); db = ensureStructure(db);
    const reqUser = getUser(requester, db);
    if(!reqUser || getRankWeight(reqUser.role) < 3) return res.status(403).json({ error: 'Unauthorized' });
    const pendingUsers = db.users.filter(u => u.status === 'pending').map(u => ({ username: u.username, role: u.role, status: u.status }));
    res.json(pendingUsers);
});
app.post('/api/admin/approve', (req, res) => {
    const { requester, username, action } = req.body;
    let db = getDb(); db = ensureStructure(db);
    const reqUser = getUser(requester, db);
    if(!reqUser || getRankWeight(reqUser.role) < 3) return res.status(403).json({ error: 'Unauthorized' });
    const userIndex = db.users.findIndex(u => u.username === username);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    if (action === 'approve') {
        db.users[userIndex].status = 'approved';
        db.users[userIndex].role = 'moderator';
    } else if (action === 'deny') {
        db.users.splice(userIndex, 1);
    }
    saveDb(db);
    res.json({ message: `User ${username} has been ${action}d.` });
});
app.post('/api/admin/staff', (req, res) => {
    const { requester } = req.body;
    let db = getDb(); db = ensureStructure(db);
    const reqUser = getUser(requester, db);
    if(!reqUser || getRankWeight(reqUser.role) < 3) return res.status(403).json({ error: 'Unauthorized' });
    const staffUsers = db.users.filter(u => u.status === 'approved').map(u => ({ username: u.username, role: u.role }));
    res.json(staffUsers);
});
app.post('/api/admin/rank', (req, res) => {
    const { requester, targetUser, newRole, action } = req.body; 
    let db = getDb(); db = ensureStructure(db);
    const reqUser = getUser(requester, db);
    const target = getUser(targetUser, db);
    if(!reqUser || !target) return res.status(404).json({ error: 'User not found' });
    const reqWeight = getRankWeight(reqUser.role);
    const targetWeight = getRankWeight(target.role);
    if(reqWeight <= targetWeight && reqUser.username !== target.username) return res.status(403).json({ error: 'Cannot manage equal or higher rank.' });
    if(action === 'remove') {
        if(reqUser.username === target.username) return res.status(403).json({ error: "Cannot remove yourself." });
        const idx = db.users.findIndex(u => u.username === target.username);
        db.users.splice(idx, 1);
        saveDb(db);
        return res.json({ message: `${target.username} terminated.` });
    }
    if(action === 'update') {
        const newWeight = getRankWeight(newRole);
        if(newWeight > reqWeight || (newWeight === reqWeight && reqUser.role !== 'staff manager')) return res.status(403).json({ error: 'Cannot promote above rank.' });
        target.role = newRole;
        saveDb(db);
        return res.json({ message: `Updated ${target.username} to ${newRole}.` });
    }
    res.status(400).json({ error: 'Invalid action' });
});
app.post('/api/action', (req, res) => {
    const { requester, actionType, target, reason, meta } = req.body;
    let db = getDb(); db = ensureStructure(db);
    const reqUser = getUser(requester, db);
    if(!reqUser) return res.status(403).json({error: "Unauthorized"});
    const weight = getRankWeight(reqUser.role);
    if (actionType === 'ban' && weight < 2) return res.status(403).json({error: "Must be Administrator to Ban."});
    const newLog = {
        id: Date.now(), staff: reqUser.username, action: actionType,
        target: target, reason: reason || "No reason", timestamp: Date.now(), meta: meta || ""
    };
    db.logs.unshift(newLog); 
    if (db.logs.length > 500) db.logs.pop();
    saveDb(db);
    res.json({ success: true, message: `Successfully performed ${actionType} on ${target}.` });
});
app.post('/api/action/logs', (req, res) => {
    const { requester } = req.body;
    let db = getDb(); db = ensureStructure(db);
    const reqUser = getUser(requester, db);
    if(!reqUser) return res.status(403).json({error: "Unauthorized"});
    res.json(db.logs);
});
app.post('/api/announcements', (req, res) => {
    const { requester, title, content } = req.body;
    let db = getDb(); db = ensureStructure(db);
    const reqUser = getUser(requester, db);
    if(!reqUser || getRankWeight(reqUser.role) < 3) return res.status(403).json({error: "Management only."});
    db.announcements.unshift({ id: Date.now(), author: reqUser.username, title, content, timestamp: Date.now() });
    saveDb(db);
    res.json({success: true, message: "Announcement posted."});
});
app.get('/api/announcements', (req, res) => {
    let db = getDb(); db = ensureStructure(db);
    res.json(db.announcements);
});
app.get('/api/reports', (req, res) => {
    let db = getDb(); db = ensureStructure(db);
    res.json(db.reports);
});
app.post('/api/reports/resolve', (req, res) => {
    const { requester, reportId, resolution } = req.body;
    let db = getDb(); db = ensureStructure(db);
    const reqUser = getUser(requester, db);
    if(!reqUser) return res.status(403).json({error: "Unauthorized"});
    const idx = db.reports.findIndex(r => r.id == reportId);
    if(idx === -1) return res.status(404).json({error: "Report not found or already resolved."});
    const report = db.reports[idx];
    db.logs.unshift({
        id: Date.now(), staff: reqUser.username, action: 'resolve_report',
        target: report.target, reason: `Resolved report by ${report.reporter}: ${resolution}`, 
        timestamp: Date.now(), meta: `ReportID: ${report.id}`
    });
    db.reports.splice(idx, 1);
    saveDb(db);
    res.json({success: true, message: "Report successfully resolved."});
});
app.post('/api/roblox/report', (req, res) => {
    const { reporter, target, reason } = req.body;
    let db = getDb(); db = ensureStructure(db);
    db.reports.unshift({ id: Date.now(), reporter, target, reason, timestamp: Date.now() });
    saveDb(db);
    res.json({success: true});
});
app.post('/api/roblox/sync', (req, res) => {
    const { playerCount, activeStaff, apiKey } = req.body;
    if(apiKey !== "ROBLOX_SECRET_KEY") return res.status(403).json({error: "Invalid Key"});
    let db = getDb(); db = ensureStructure(db);
    if(playerCount !== undefined) db.robloxStats.playerCount = playerCount;
    if(activeStaff !== undefined) db.robloxStats.activeStaff = activeStaff;
    saveDb(db);
    res.json({ success: true, message: 'Stats updated.' });
});
app.get('/api/stats', (req, res) => {
    let db = getDb(); db = ensureStructure(db);
    res.json({
        ...db.robloxStats,
        activeReports: db.reports.length 
    });
});
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
