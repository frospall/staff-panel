let currentUser = null;
let currentAuthMode = 'login'; 
const RANK_WEIGHTS = {
    'moderator': 1, 'administrator': 2, 'management': 3, 'staff manager': 4
};
function getWeight(role) { return RANK_WEIGHTS[role.toLowerCase()] || 0; }
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
    initUI();
    initVFX();
    const storedUser = localStorage.getItem('staffPanelUser');
    if (storedUser) handleSuccessfulLogin(JSON.parse(storedUser));
});
function initVFX() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn') || e.target.closest('.btn')) {
            const btn = e.target.classList.contains('btn') ? e.target : e.target.closest('.btn');
            const circle = document.createElement('span');
            const diameter = Math.max(btn.clientWidth, btn.clientHeight);
            const radius = diameter / 2;
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
            circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
            circle.classList.add('ripple');
            const existingRipple = btn.querySelector('.ripple');
            if (existingRipple) { existingRipple.remove(); }
            btn.appendChild(circle);
            setTimeout(() => circle.remove(), 600);
        }
    });
}
function initAuth() {
    const authForm = document.getElementById('auth-form');
    const authTabs = document.querySelectorAll('.auth-tab');
    const submitBtn = document.getElementById('auth-submit-btn');
    const msgBox = document.getElementById('auth-message');
    authTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            authTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentAuthMode = e.target.getAttribute('data-auth');
            submitBtn.textContent = currentAuthMode === 'login' ? 'Login to Panel' : 'Submit Application';
            msgBox.style.display = 'none';
        });
    });
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-username').value;
        const password = document.getElementById('auth-password').value;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        try {
            const endpoint = currentAuthMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
            const res = await fetch(endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) {
                showAuthMsg(data.error, 'error');
            } else {
                if (currentAuthMode === 'login') {
                    if (data.status === 'pending') showAuthMsg('Account pending approval.', 'pending');
                    else if (data.status === 'approved') {
                        localStorage.setItem('staffPanelUser', JSON.stringify(data));
                        handleSuccessfulLogin(data);
                    }
                } else {
                    showAuthMsg('Application submitted.', 'success');
                    authTabs[0].click();
                }
            }
        } catch (err) { showAuthMsg('Server connection failed.', 'error'); }
        submitBtn.disabled = false;
        submitBtn.textContent = currentAuthMode === 'login' ? 'Login to Panel' : 'Submit Application';
    });
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('staffPanelUser');
        window.location.reload();
    });
}
function showAuthMsg(msg, type) {
    const box = document.getElementById('auth-message');
    box.textContent = msg; box.className = `auth-message ${type}`; box.style.display = 'block';
}
function handleSuccessfulLogin(user) {
    if(user.status !== 'approved') return;
    currentUser = user;
    document.getElementById('auth-container').style.display = 'none';
    const appEl = document.getElementById('app-container');
    appEl.style.display = 'flex'; appEl.classList.add('fade-in');
    document.getElementById('profile-name').textContent = user.username;
    const roleEl = document.getElementById('profile-role');
    const cleanRole = user.role.toLowerCase();
    roleEl.textContent = user.role.replace(/\b\w/g, c => c.toUpperCase());
    roleEl.className = 'role'; 
    if (cleanRole === 'staff manager') roleEl.classList.add('admin');
    if (cleanRole === 'management') roleEl.style.color = 'var(--accent-purple)';
    const weight = getWeight(user.role);
    if (weight < 2) {
        if(document.getElementById('btn-ban')) document.getElementById('btn-ban').style.display = 'none';
        if(document.getElementById('btn-unban')) document.getElementById('btn-unban').style.display = 'none';
        if(document.getElementById('btn-give')) document.getElementById('btn-give').style.display = 'none';
    }
    if (weight >= 3) {
        document.getElementById('nav-admin').style.display = 'flex'; 
        document.getElementById('post-announcement-card').style.display = 'flex';
    }
    fetchStats();
}
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetPage = document.getElementById(targetId);
            if (targetPage) {
                targetPage.classList.add('active');
                targetPage.classList.remove('fade-in');
                void targetPage.offsetWidth; 
                targetPage.classList.add('fade-in');
                if (targetId === 'admin-panel' && getWeight(currentUser.role) >= 3) loadAdminData();
                else if (targetId === 'staff-panel') fetchStats();
                else if (targetId === 'mod-logs') loadLogs();
                else if (targetId === 'announcements') loadAnnouncements();
                else if (targetId === 'live-reports') loadReports();
            }
        });
    });
}
async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        const ps = document.getElementById('stat-players');
        const ss = document.getElementById('stat-staff');
        const rs = document.getElementById('stat-reports');
        if(ps) ps.textContent = data.playerCount.toLocaleString();
        if(ss) ss.textContent = data.activeStaff;
        if(rs) rs.textContent = data.activeReports;
    } catch(e) {}
}
document.getElementById('btn-lookup').addEventListener('click', async () => {
    const input = document.getElementById('lookup-input').value;
    const btn = document.getElementById('btn-lookup');
    if(!input) return;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
        const res = await fetch('/api/player/' + input);
        const data = await res.json();
        
        document.getElementById('lookup-name').textContent = data.username;
        const countTxt = data.infractions === 1 ? '1 Recorded Infraction' : `${data.infractions} Recorded Infractions`;
        document.getElementById('lookup-infractions').innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${countTxt}`;
        
        const histDiv = document.getElementById('lookup-history');
        if (data.history.length === 0) {
            histDiv.innerHTML = '<p class="text-muted text-center" style="padding:1rem;">Clean record. No punishments found.</p>';
        } else {
            histDiv.innerHTML = data.history.map(h => {
                const d = new Date(h.timestamp).toLocaleDateString();
                const act = `<span class="badge" style="background:var(--glass-border);color:white;font-size:0.7rem;padding:0.15rem 0.4rem;">${h.action.toUpperCase()}</span>`;
                return `<div style="display:flex; flex-direction:column; gap:0.25rem; padding-bottom:0.75rem; border-bottom:1px solid var(--glass-border);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">${act} <span style="font-size:0.8rem; color:var(--text-muted);">${d}</span></div>
                            <span style="font-size:0.9rem;"><strong>Staff:</strong> ${h.staff}</span>
                            <span style="font-size:0.9rem; color:var(--text-secondary);">"${h.reason}" ${h.meta ? '('+h.meta+')' : ''}</span>
                        </div>`;
            }).join('');
        }
        document.getElementById('profile-modal').style.display = 'flex';
    } catch(e) { alert("Failed to fetch player database."); }
    btn.innerHTML = '<i class="fa-solid fa-search"></i> Inspect';
});
window.loadReports = async function() {
    const tb = document.getElementById('reports-feed');
    tb.innerHTML = '<p class="text-muted col-span-3 text-center"><i class="fa-solid fa-spinner fa-spin"></i> Fetching reports...</p>';
    try {
        const res = await fetch('/api/reports');
        const reports = await res.json();
        tb.innerHTML = '';
        if(reports.length === 0) return tb.innerHTML = '<div class="glass-panel col-span-3 text-center" style="padding: 3rem;"><i class="fa-solid fa-check-double text-success" style="font-size:3rem;margin-bottom:1rem;"></i><h3>All Clear!</h3><p class="text-muted">There are no pending reports in the game.</p></div>';
        reports.forEach(r => {
            const div = document.createElement('div');
            div.className = 'tool-card glass-panel fade-in';
            const d = new Date(r.timestamp).toLocaleTimeString();
            div.innerHTML = `
                <div class="card-header flex-row" style="justify-content:space-between;">
                    <h3 style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Report #${r.id.toString().slice(-4)}</h3>
                    <span class="text-muted" style="font-size:0.8rem">${d}</span>
                </div>
                <div class="card-body">
                    <p style="margin-bottom:0.5rem;"><span class="text-muted">Target:</span> <strong>${r.target}</strong></p>
                    <p style="margin-bottom:1rem;"><span class="text-muted">Reported by:</span> <span style="color:var(--accent-cyan)">${r.reporter}</span></p>
                    <p style="background:rgba(0,0,0,0.3); padding:0.75rem; border-radius:4px; font-size:0.9rem; border-left: 2px solid var(--danger);">"${r.reason}"</p>
                    <div class="mt-3 flex-row" style="gap:0.5rem;">
                        <button class="btn btn-success flex-1" style="width:100%;background:var(--success);color:white;" onclick="resolveReport(${r.id})">Mark Resolved</button>
                    </div>
                </div>
            `;
            tb.appendChild(div);
        });
        fetchStats(); 
    } catch(e) { tb.innerHTML = '<p class="text-muted col-span-3 text-center">Failed to fetch reports.</p>'; }
}
window.resolveReport = async function(reportId) {
    const resolution = prompt("Enter resolution notes (e.g., Ban applied, false report):");
    if(resolution === null) return; 
    try {
        const res = await fetch('/api/reports/resolve', { 
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({requester: currentUser.username, reportId, resolution}) 
        });
        if(res.ok) { window.loadReports(); } else alert("Failed to resolve.");
    } catch (e) { alert("Action failed."); }
}
async function loadAdminData() { loadPendingUsers(); loadActiveStaff(); }
async function loadPendingUsers() {
    const tb = document.getElementById('pending-users-tb');
    const msg = document.getElementById('no-pending-msg');
    try {
        const res = await fetch('/api/admin/pending', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({requester: currentUser.username}) });
        const users = await res.json();
        tb.innerHTML = '';
        if (users.length === 0) msg.style.display = 'block';
        else {
            msg.style.display = 'none';
            users.forEach(u => {
                const div = document.createElement('div');
                div.className = 'action-item flex-row'; div.style.justifyContent = 'space-between';
                div.innerHTML = `<div style="flex:1"><strong style="color:var(--accent-cyan)">${u.username}</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">Applied</span></div>
                    <div style="display:flex; gap:0.5rem">
                        <button class="btn btn-primary btn-small" onclick="handleApproval('${u.username}', 'approve')"><i class="fa-solid fa-check"></i></button>
                        <button class="btn btn-danger btn-small" onclick="handleApproval('${u.username}', 'deny')"><i class="fa-solid fa-xmark"></i></button>
                    </div>`;
                tb.appendChild(div);
            });
        }
    } catch (e) { }
}
async function loadActiveStaff() {
    const tb = document.getElementById('active-staff-tb');
    try {
        const res = await fetch('/api/admin/staff', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({requester: currentUser.username}) });
        if(!res.ok) return;
        const users = await res.json();
        tb.innerHTML = '';
        users.forEach(u => {
            const isSelf = u.username === currentUser.username;
            const canManage = getWeight(currentUser.role) > getWeight(u.role) && !isSelf;
            let manageHtml = '<span class="text-muted" style="font-size:0.8rem">No Access</span>';
            if(canManage) {
                manageHtml = `<div style="display:flex;gap:0.5rem">
                        <select id="role-${u.username}" style="background:rgba(0,0,0,0.5);color:white;border:1px solid var(--glass-border);border-radius:4px;padding:2px;">
                            <option value="moderator" ${u.role==='moderator'?'selected':''}>Mod</option>
                            <option value="administrator" ${u.role==='administrator'?'selected':''}>Admin</option>
                            <option value="management" ${u.role==='management'?'selected':''}>Mgmt</option>
                            <option value="staff manager" ${u.role==='staff manager'?'selected':''}>Manager</option>
                        </select>
                        <button class="btn btn-primary btn-small" onclick="window.handleRankChange('${u.username}')">Save</button>
                        <button class="btn btn-danger btn-small" onclick="window.handleStaffRemove('${u.username}')"><i class="fa-solid fa-trash"></i></button>
                    </div>`;
            } else if (isSelf) manageHtml = '<span style="color:var(--accent-gold);font-size:0.8rem">You</span>';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${u.username}</strong></td><td><span class="status-badge" style="background:var(--glass-border);color:white">${u.role}</span></td><td>${manageHtml}</td>`;
            tb.appendChild(tr);
        });
    } catch (e) { }
}
window.handleApproval = async function(username, action) {
    if(!confirm(`Are you sure you want to ${action} ${username}?`)) return;
    try {
        const res = await fetch('/api/admin/approve', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({requester: currentUser.username, username, action}) });
        const data = await res.json();
        if(res.ok) { alert(data.message); loadAdminData(); } else alert(data.error);
    } catch (e) { }
}
window.handleRankChange = async function(targetUser) {
    const newRole = document.getElementById(`role-${targetUser}`).value;
    try {
        const res = await fetch('/api/admin/rank', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({requester: currentUser.username, targetUser, newRole, action: 'update'}) });
        const data = await res.json();
        if(res.ok) alert(data.message); else alert("Error: " + data.error);
        loadAdminData();
    } catch (e) { }
}
window.handleStaffRemove = async function(targetUser) {
    if(!confirm(`Remove ${targetUser}?`)) return;
    try {
        const res = await fetch('/api/admin/rank', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({requester: currentUser.username, targetUser, action: 'remove'}) });
        const data = await res.json();
        if(res.ok) alert(data.message); else alert(data.error);
        loadAdminData();
    } catch (e) { }
}
async function loadLogs() {
    const tb = document.getElementById('logs-tb');
    try {
        const res = await fetch('/api/action/logs', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({requester: currentUser.username})});
        const logs = await res.json();
        tb.innerHTML = '';
        if(logs.length === 0) return tb.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No logs recorded yet.</td></tr>';
        logs.forEach(l => {
            const tr = document.createElement('tr');
            tr.className = 'log-row';
            const d = new Date(l.timestamp).toLocaleString();
            let actionHtml = `<span class="badge" style="background:var(--glass-border);color:white">${l.action.toUpperCase()}</span>`;
            if(l.action === 'resolve_report') actionHtml = `<span class="badge" style="background:var(--success);color:white">REPORT RESOLVED</span>`;
            tr.innerHTML = `<td>${d}</td><td class="log-staff"><span style="color:var(--accent-cyan)">${l.staff}</span></td><td class="log-action">${actionHtml}</td><td class="log-target"><strong>${l.target}</strong></td><td>${l.reason} <span class="text-muted" style="font-size:0.8rem">${l.meta?'('+l.meta+')':''}</span></td>`;
            tb.appendChild(tr);
        });
    } catch(e) {}
}

window.filterLogs = function() {
    const filter = document.getElementById('log-search-input').value.toLowerCase();
    const rows = document.querySelectorAll('#logs-tb .log-row');
    rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(filter) ? '' : 'none';
    });
}
async function loadAnnouncements() {
    const feed = document.getElementById('announcements-feed');
    try {
        const res = await fetch('/api/announcements');
        const data = await res.json();
        feed.innerHTML = '';
        if(data.length === 0) return feed.innerHTML = '<p class="text-muted">No announcements.</p>';
        data.forEach(a => {
            const d = new Date(a.timestamp).toLocaleString();
            const div = document.createElement('div');
            div.className = 'glass-panel p-3';
            div.style.padding = '1.5rem';
            div.innerHTML = `<h3 style="margin-bottom:0.5rem;display:flex;align-items:center;gap:0.5rem;"><i class="fa-solid fa-bullhorn text-info"></i> ${a.title}</h3>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">Posted by <span style="color:var(--accent-cyan)">${a.author}</span> on ${d}</p>
                <div style="line-height:1.6;color:var(--text-primary)">${a.content}</div>`;
            feed.appendChild(div);
        });
    } catch(e) {}
}
document.getElementById('btn-post-announce').addEventListener('click', async () => {
    const title = document.getElementById('announce-title').value;
    const content = document.getElementById('announce-content').value;
    if(!title || !content) return alert("Fill out all fields");
    try {
        const res = await fetch('/api/announcements', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({requester: currentUser.username, title, content})});
        if(res.ok) { document.getElementById('announce-title').value=''; document.getElementById('announce-content').value=''; loadAnnouncements(); }
        else alert("Failed to post");
    } catch(e) { }
});
function initUI() {
    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.getAttribute('data-clipboard')).then(() => {
                const inner = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                btn.style.background = 'var(--success)';
                setTimeout(() => { btn.innerHTML = inner; btn.style.background = ''; }, 2000);
            });
        });
    });
    document.getElementById('modal-execute').addEventListener('click', async (e) => {
        const btn = e.target;
        const target = document.getElementById('modal-target').value;
        const reason = document.getElementById('modal-reason').value;
        const meta = document.getElementById('modal-meta').value;
        const actionType = window.currentModalAction;
        const originalText = btn.innerHTML;
        if(!target) return alert("Please enter a target username.");
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Executing...';
        btn.disabled = true;
        try {
            const res = await fetch('/api/action', {
                method: 'POST', headers: {'Content-Type':'application/json'}, 
                body: JSON.stringify({requester: currentUser.username, actionType, target, reason, meta })
            });
            const data = await res.json();
            if(res.ok) {
                alert(`Action logged: ${actionType} on ${target}`);
                closeModal(); 
            } else {
                alert(data.error);
            }
        } catch(e) { alert("Failed to reach server"); }
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}
const actionMetaMap = {
    'ban': { title: '<i class="fa-solid fa-gavel text-danger"></i> Ban', lbl: 'Duration (Days)', def: 'Permanent' },
    'unban': { title: '<i class="fa-solid fa-unlock text-success"></i> Unban', lbl: 'Appeal Link / Reason', def: 'Appealed' },
    'kick': { title: '<i class="fa-solid fa-user-slash text-warning"></i> Kick', lbl: 'N/A', def: 'N/A', hideMeta: true },
    'mute': { title: '<i class="fa-solid fa-comment-slash text-info"></i> Mute', lbl: 'Duration (Hours)', def: '24' },
    'warn': { title: '<i class="fa-solid fa-triangle-exclamation text-warning"></i> Warn', lbl: 'N/A', def: 'N/A', hideMeta: true },
    'jail': { title: '<i class="fa-solid fa-bars text-secondary"></i> Jail', lbl: 'Cell ID / Duration', def: 'Pending review' },
    'give': { title: '<i class="fa-solid fa-coins text-gold"></i> Economy Adjust', lbl: 'Amount (Negative or Positive)', def: '1000' }
};
window.openModal = function(action) {
    window.currentModalAction = action;
    const modal = document.getElementById('action-modal');
    const title = document.getElementById('modal-title');
    const grp = document.getElementById('duration-group');
    const lbl = document.getElementById('lbl-meta');
    const conf = actionMetaMap[action];
    title.innerHTML = conf.title;
    if(conf.hideMeta) grp.style.display = 'none';
    else { grp.style.display = 'block'; lbl.textContent = conf.lbl; document.getElementById('modal-meta').value = conf.def; }
    document.getElementById('modal-target').value = '';
    document.getElementById('modal-reason').value = '';
    modal.style.display = 'flex';
}
window.closeModal = function() {
    document.getElementById('action-modal').style.display = 'none';
    document.getElementById('modal-target').value = '';
    document.getElementById('modal-reason').value = '';
}
