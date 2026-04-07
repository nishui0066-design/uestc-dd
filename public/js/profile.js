// profile.js - 个人中心页面专用

let me = null;
let invites = [];
let matches = [];
let history = [];

// 页面加载
window.onload = () => {
    const saved = localStorage.getItem("user");
    if (saved) {
        me = JSON.parse(saved);
        if (!me.scores) me.scores = {};
        if (!me.currentSport) me.currentSport = null;
        if (!me.currentStatus) me.currentStatus = "在线";
        renderMe();
        loadMyData();
        sendMeToServer();
    }
    setInterval(syncMyData, 3000);
};

function sendMeToServer() {
    fetch("/online", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(me)
    });
}

function syncMyData() {
    if (!me) return;
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            invites = data.invites || [];
            matches = data.matches || [];
            history = data.history || [];
            renderMyInvites();
            renderMyMatches();
        })
        .catch(err => console.error("同步失败:", err));
}

function loadMyData() {
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            invites = data.invites || [];
            matches = data.matches || [];
            history = data.history || [];
            renderMyInvites();
            renderMyMatches();
        });
}

function renderMe() {
    document.getElementById("info-name").innerText = me.name;
    document.getElementById("info-gender").innerText = me.gender;
    
    if (me.currentSport && me.scores && me.scores[me.currentSport] !== undefined) {
        document.getElementById("info-score").innerText = me.scores[me.currentSport];
    } else {
        document.getElementById("info-score").innerText = "—";
    }
    
    const totalScore = me.scores ? Object.values(me.scores).reduce((a, b) => (a || 0) + (b || 0), 0) : 0;
    const rank = getRank(totalScore);
    document.getElementById("info-rank").innerHTML = rank;
    
    const sportText = me.currentSport ? me.currentSport : "未选择";
    const statusText = me.currentStatus ? me.currentStatus : "在线";
    document.getElementById("info-status").innerHTML = `${sportText} · ${statusText}`;
}

function getRank(score) {
    if (score < 200) return "🥉 青铜";
    if (score < 500) return "🥈 白银";
    if (score < 1000) return "🥇 黄金";
    if (score < 2000) return "💎 铂金";
    if (score < 3500) return "🔮 钻石";
    return "👑 王者";
}

async function renderMyInvites() {
    if (!me) return;
    const my = invites.filter(i => i.to === me.id);
    document.getElementById("req-count").innerText = my.length;
    const box = document.getElementById("incoming-requests");
    box.innerHTML = "";
    
    const response = await fetch("/data");
    const data = await response.json();
    const allUsers = [...data.onlineUsers, ...data.userProfiles];
    const uniqueUsers = allUsers.filter((u, index, self) => 
        index === self.findIndex(t => t.id === u.id)
    );
    
    my.forEach(i => {
        const from = uniqueUsers.find(u => u.id === i.from) || { name: "未知" };
        const div = document.createElement("div");
        div.className = "req-item";
        div.innerHTML = `
            <span>${from.name} 邀请你</span>
            <button onclick="acceptInvite('${i.from}')">同意</button>
        `;
        box.appendChild(div);
    });
}

function acceptInvite(fromId) {
    const alreadyMatched = matches.some(m => 
        (m.p1 === fromId && m.p2 === me.id) || 
        (m.p1 === me.id && m.p2 === fromId)
    );
    
    if (alreadyMatched) {
        alert("你们已经是搭子了");
        fetch("/invite/clear", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ to: me.id })
        });
        renderMyInvites();
        return;
    }
    
    fetch("/match", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ p1: fromId, p2: me.id })
    }).then(() => {
        fetch("/invite/clear", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ to: me.id })
        });
        renderMyInvites();
        renderMyMatches();
        alert("已添加为搭子！");
    });
}

function renderMyMatches() {
    if (!me) return;
    const my = matches.filter(m => m.p1 === me.id || m.p2 === me.id);
    const box = document.getElementById("matched-list");
    box.innerHTML = "";
    
    if (my.length === 0) {
        box.innerHTML = "<p>暂无搭子，去广场邀请吧</p>";
        return;
    }
    
    fetch("/data").then(r => r.json()).then(data => {
        const allUsers = [...data.onlineUsers, ...data.userProfiles];
        const uniqueUsers = allUsers.filter((u, index, self) => 
            index === self.findIndex(t => t.id === u.id)
        );
        
        my.forEach(m => {
            const pid = m.p1 === me.id ? m.p2 : m.p1;
            const user = uniqueUsers.find(u => u.id === pid) || { name: "离线", scores: {}, currentSport: null };
            const sportScore = (user.currentSport && user.scores && user.scores[user.currentSport] !== undefined) ? user.scores[user.currentSport] : "—";
            const div = document.createElement("div");
            div.className = "req-item";
            div.innerHTML = `
                <span style="cursor:pointer;color:#5b78f5;" onclick="showUserDetail('${pid}')">${user.name} (${sportScore}分)</span>
                <div style="display:flex;gap:6px">
                    <button onclick="goToChat('${pid}','${user.name}')">💬 聊天</button>
                    <button onclick="openActivity('${pid}','${user.name}')">🎮 活动</button>
                    <button onclick="removeMatch('${pid}')" style="background:#e74c3c">解除</button>
                </div>
            `;
            box.appendChild(div);
        });
    });
}

function goToChat(pid, name) {
    // 跳转到聊天页面并打开对应聊天
    localStorage.setItem("openChatWith", JSON.stringify({ id: pid, name: name }));
    window.location.href = "chat.html";
}

function showUserDetail(pid) {
    fetch("/data").then(r => r.json()).then(data => {
        let user = data.onlineUsers.find(u => u.id === pid);
        if (!user) user = data.userProfiles.find(p => p.id === pid);
        if (user) {
            let scoresHtml = "";
            if (user.scores && Object.keys(user.scores).length > 0) {
                scoresHtml = "<p><strong>各项积分：</strong></p><ul>";
                for (const [sport, score] of Object.entries(user.scores)) {
                    scoresHtml += `<li>${sport}: ${score}分</li>`;
                }
                scoresHtml += "</ul>";
            } else {
                scoresHtml = "<p>暂无运动记录</p>";
            }
            const modalHtml = `
                <div id="user-detail-modal" class="modal" style="display:flex;">
                    <div class="modal-content" style="width:350px;">
                        <h3>📋 用户详情</h3>
                        <div style="text-align:left;margin:15px 0;">
                            <p><strong>昵称：</strong>${user.name}</p>
                            <p><strong>性别：</strong>${user.gender}</p>
                            <p><strong>当前运动：</strong>${user.currentSport || "未选择"}</p>
                            <p><strong>当前状态：</strong>${user.currentStatus || "在线"}</p>
                            ${scoresHtml}
                        </div>
                        <button onclick="closeUserDetailModal()" class="btn-lose">关闭</button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML("beforeend", modalHtml);
        } else {
            alert("用户信息不存在");
        }
    });
}

function closeUserDetailModal() {
    const modal = document.getElementById("user-detail-modal");
    if (modal) modal.remove();
}

function openActivity(pid, name) {
    // 存储当前活动对手
    localStorage.setItem("activityPartner", JSON.stringify({ id: pid, name: name }));
    window.location.href = "activity.html";
}

function removeMatch(partnerId) {
    if (confirm("确定要解除搭子关系吗？")) {
        fetch("/match/remove", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ me: me.id, partner: partnerId })
        }).then(() => {
            alert("已解除搭子关系");
            renderMyMatches();
        });
    }
}

// 编辑资料功能
function openEditProfile() {
    document.getElementById("edit-name").value = me.name;
    document.getElementById("edit-gender").value = me.gender;
    document.getElementById("edit-profile-modal").style.display = "flex";
}

function closeEditProfile() {
    document.getElementById("edit-profile-modal").style.display = "none";
}

function saveEditProfile() {
    const newName = document.getElementById("edit-name").value.trim();
    if (!newName) {
        alert("昵称不能为空");
        return;
    }
    me.name = newName;
    me.gender = document.getElementById("edit-gender").value;
    localStorage.setItem("user", JSON.stringify(me));
    renderMe();
    sendMeToServer();
    closeEditProfile();
    alert("资料已更新");
}

// 状态设置
function openStatusModal() {
    const sports = ["足球", "篮球", "羽毛球", "游泳", "王者荣耀", "瓦罗兰特", "LOL", "钢琴", "吉他", "古筝"];
    const sportOptions = sports.map(s => `<option value="${s}" ${me.currentSport === s ? "selected" : ""}>${s}</option>`).join("");
    const statusOptions = ["在线", "等待匹配", "游戏中", "休息中"].map(s => `<option value="${s}" ${me.currentStatus === s ? "selected" : ""}>${s}</option>`).join("");
    
    document.getElementById("sport-select").innerHTML = sportOptions;
    document.getElementById("status-select").innerHTML = statusOptions;
    document.getElementById("status-modal").style.display = "flex";
}

function closeStatusModal() {
    document.getElementById("status-modal").style.display = "none";
}

function saveStatus() {
    const newSport = document.getElementById("sport-select").value;
    const newStatus = document.getElementById("status-select").value;
    me.currentSport = newSport;
    me.currentStatus = newStatus;
    localStorage.setItem("user", JSON.stringify(me));
    renderMe();
    sendMeToServer();
    closeStatusModal();
    alert("状态已更新");
}

// 活动记录
function showHistory() {
    const myHistory = history.filter(h => h.winner === me.id || h.loser === me.id);
    if (myHistory.length === 0) {
        alert("暂无活动记录");
        return;
    }
    
    let historyHtml = "<div style='text-align:left;max-height:300px;overflow-y:auto;'>";
    myHistory.forEach(h => {
        const isWinner = h.winner === me.id;
        const result = isWinner ? "获胜" : "失败";
        const scoreChange = isWinner ? "+10" : "0";
        const time = new Date(h.time).toLocaleString();
        historyHtml += `<p style='border-bottom:1px solid #eee;padding:8px 0;'>${time}<br>${h.sport} · ${result} · 积分变化: ${scoreChange}</p>`;
    });
    historyHtml += "</div>";
    
    document.getElementById("history-content").innerHTML = historyHtml;
    document.getElementById("history-modal").style.display = "flex";
}

function closeHistoryModal() {
    document.getElementById("history-modal").style.display = "none";
}