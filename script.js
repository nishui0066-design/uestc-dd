// ==================== 联机版校搭系统 ====================
// 无假人、真实邀请、真实聊天、仅本人可见通知
// ======================================================



// 本机唯一用户
let me = null;
let userId = localStorage.userId || (localStorage.userId = "u" + Date.now());

// 在线用户、邀请、匹配、聊天（全部存在浏览器共享内存中）
let onlineUsers = [];
let invites = [];
let matches = [];
let chatRecords = {};

// 页面加载时恢复自己
window.onload = () => {
    const saved = localStorage.user;
    if (saved) {
    me = JSON.parse(saved);
    if (!me.scores) me.scores = {};
    if (!me.currentSport) me.currentSport = null;
    if (!me.currentStatus) me.currentStatus = "在线";
    document.getElementById("user-info-panel").style.display = "block";
    renderMe();
    refreshOnlineUsers();
    renderMyInvites();
    renderMyMatches();
    }
    setInterval(syncAll, 3000);
    window.addEventListener("beforeunload", () => {
        fetch("/offline", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ id: me ? me.id : null })
        });
    });
};

// 同步数据（联机核心）
function syncAll() {
    if (!me) return;
    fetch("/data")
        .then(r=>r.json())
        .then(data=>{
            onlineUsers = data.onlineUsers || [];
            invites = data.invites || [];
            matches = data.matches || [];
            chatRecords = data.chatRecords || {};
            renderMyInvites();
            renderMyMatches();
            renderChatIfOpen();
        })
        .catch(err => console.error("同步失败:", err));
}



function renderMe() {
    document.getElementById("info-name").innerText = me.name;
    document.getElementById("info-gender").innerText = me.gender;
    
    // 根据当前运动显示对应积分
    if (me.currentSport && me.scores && me.scores[me.currentSport] !== undefined) {
        document.getElementById("info-score").innerText = me.scores[me.currentSport];
    } else {
        document.getElementById("info-score").innerText = "—";
    }
    
    const sportText = me.currentSport ? me.currentSport : "未选择";
    const statusText = me.currentStatus ? me.currentStatus : "在线";
    document.getElementById("info-status").innerHTML = `${sportText} · ${statusText} <button onclick="openStatusModal()" style="font-size:12px;padding:2px 8px;">设置</button>`;
}

// 上传自己到服务器（联机）
function sendMeToServer() {
    fetch("/online", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(me)
    });
}

// 刷新在线用户
function refreshOnlineUsers() {
    if (!me) return alert("请先注册");
    fetch("/data")
        .then(r=>r.json())
        .then(data=>{
            onlineUsers = data.onlineUsers || [];
            renderOnlineUsers();
        })
        .catch(err => {
            console.error("刷新失败:", err);
            alert("网络错误，请检查服务器是否运行");
        });
}

let lastOnlineHash = "";

let lastUserIds = [];

function renderOnlineUsers() {
    if (!me) return;
    const list = getFilteredUsers();
    const newUserIds = list.map(u => u.id);
    
    // 检查用户列表是否变化
    if (JSON.stringify(newUserIds) === JSON.stringify(lastUserIds)) {
        // 只更新积分
        list.forEach(u => {
            const card = document.querySelector(`.card[data-id='${u.id}']`);
            if (card) {
                const totalScore = u.scores ? Object.values(u.scores).reduce((a,b) => (a||0)+(b||0), 0) : 0;
                const scoreSpan = card.querySelector(".score-value");
                if (scoreSpan) scoreSpan.innerText = totalScore;
            }
        });
        return;
    }
    
    lastUserIds = newUserIds;
    const box = document.getElementById("square");
    box.innerHTML = "";
    
    if (list.length === 0) {
        box.innerHTML = "<p>暂无符合条件的在线用户</p>";
        return;
    }
    
    list.forEach(u => {
        const card = document.createElement("div");
        card.className = "card";
        card.setAttribute("data-id", u.id);
        card.innerHTML = `
            <h4>${u.name} (${u.gender})</h4>
            <p>🎮 ${u.currentSport || "未选择"} · ${u.currentStatus || "在线"}</p>
            <p>⭐ ${u.currentSport || "未选择"}积分：<span class="score-value">${u.scores && u.scores[u.currentSport] ? u.scores[u.currentSport] : "—"}</span></p>
            <button onclick="sendInvite('${u.id}')">邀请搭子</button>
        `;
        box.appendChild(card);
    });
}

// 发送邀请（只发给对方，别人看不见）
function sendInvite(toId) {
    if (!me) return;
    fetch("/invite", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ from: me.id, to: toId })
    }).then(()=>alert("邀请已发送给对方"));
}

// 渲染我的邀请（仅自己可见）
async function renderMyInvites() {
    if (!me) return;
    const my = invites.filter(i => i.to === me.id);
    document.getElementById("req-count").innerText = my.length;
    const box = document.getElementById("incoming-requests");
    box.innerHTML = "";
    
    // 获取所有用户档案（包含离线用户）
    const response = await fetch("/data");
    const data = await response.json();
    const allUsers = [...data.onlineUsers, ...data.userProfiles];
    const uniqueUsers = allUsers.filter((u, index, self) => 
        index === self.findIndex(t => t.id === u.id)
    );
    
    my.forEach(i => {
        const from = uniqueUsers.find(u => u.id === i.from) || {name:"未知"};
        const div = document.createElement("div");
        div.className = "req-item";
        div.innerHTML = `
            <span>${from.name} 邀请你</span>
            <button onclick="acceptInvite('${i.from}')">同意</button>
        `;
        box.appendChild(div);
    });
}
// 同意邀请
function acceptInvite(fromId) {
    // 检查是否已经是搭子
    const alreadyMatched = matches.some(m => 
        (m.p1 === fromId && m.p2 === me.id) || 
        (m.p1 === me.id && m.p2 === fromId)
    );
    
    if (alreadyMatched) {
        alert("你们已经是搭子了");
        // 清除这条邀请
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
        refreshOnlineUsers();
        renderMyInvites();
        renderMyMatches();
    });
}
// 渲染我的搭子
function renderMyMatches() {
    if (!me) return;
    const my = matches.filter(m => m.p1 === me.id || m.p2 === me.id);
    const box = document.getElementById("matched-list");
    box.innerHTML = "";
    
    fetch("/data").then(r=>r.json()).then(data => {
        const allUsers = [...data.onlineUsers, ...data.userProfiles];
        const uniqueUsers = allUsers.filter((u, index, self) => 
            index === self.findIndex(t => t.id === u.id)
        );
        
        my.forEach(m => {
            const pid = m.p1 === me.id ? m.p2 : m.p1;
            const user = uniqueUsers.find(u => u.id === pid) || {name:"离线", scores: {}, currentSport: null};
            const sportScore = (user.currentSport && user.scores && user.scores[user.currentSport] !== undefined) ? user.scores[user.currentSport] : "—";
            div.className = "req-item";
            div.innerHTML = `
                <span style="cursor:pointer;color:#5b78f5;text-decoration:underline;" onclick="showUserDetail('${pid}')">${user.name} (${sportScore}分)</span>
                <div style="display:flex;gap:6px">
                    <button onclick="openChat('${pid}','${user.name}')">聊天</button>
                    <button onclick="openActivity('${pid}','${user.name}')">🎮 活动</button>
                    <button onclick="removeMatch('${pid}')" style="background:#e74c3c">解除</button>
                </div>
            `;
            box.appendChild(div);
        });
    });
}
// 智能匹配
function smartMatch() {
    if (!me) return alert("请先注册");
    fetch("/data").then(r=>r.json()).then(data=>{
        const list = (data.onlineUsers||[]).filter(u=>
            u.id !== me.id && u.currentSport === me.currentSport && u.currentSport
        );
        
        if (list.length === 0) {
            alert("没有找到同类型的在线用户");
            return;
        }
        
        // 创建弹窗
        const modalHtml = `
            <div id="smart-match-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1000;">
                <div style="background:white;border-radius:15px;padding:20px;max-width:500px;width:90%;max-height:80%;overflow-y:auto;">
                    <h3>✨ 智能匹配推荐</h3>
                    <div id="smart-match-list"></div>
                    <button onclick="closeSmartMatch()" style="margin-top:15px;background:#95a5a6;">关闭</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const listBox = document.getElementById("smart-match-list");
        list.forEach(u=>{
            const card = document.createElement("div");
            card.style.cssText = "border:1px solid #ddd;border-radius:8px;padding:10px;margin-bottom:10px;";
            card.innerHTML = `
                <h4>${u.name} (${u.gender})</h4>
                <p>${u.main} · ${u.sub} | 积分:${u.score}</p>
                <button onclick="sendInvite('${u.id}');closeSmartMatch();">邀请搭子</button>
            `;
            listBox.appendChild(card);
        });
    });
}

function closeSmartMatch() {
    const modal = document.getElementById("smart-match-modal");
    if (modal) modal.remove();
}

// ==================== 真实聊天 ====================
let currentChatId = null;
let currentChatName = null;

function openChat(pid, name) {
    currentChatId = pid;
    currentChatName = name;
    document.getElementById("chat-partner-name").innerText = name;
    document.getElementById("chat-modal").style.display = "flex";
    renderChat();
}

function closeChatModal() {
    document.getElementById("chat-modal").style.display = "none";
    currentChatId = null;
}

function renderChat() {
    if (!currentChatId) return;
    const key = [me.id, currentChatId].sort().join("-");
    const list = chatRecords[key] || [];
    const box = document.getElementById("chat-history");
    box.innerHTML = "";
    list.forEach(msg => {
        const div = document.createElement("div");
        div.className = "chat-msg " + (msg.from === me.id ? "me" : "other");
        div.innerText = msg.text;
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

function renderChatIfOpen() {
    if (document.getElementById("chat-modal").style.display === "flex") {
        renderChat();
    }
}

// 发送真实聊天（对方实时收到）
function sendRealChat() {
    const txt = document.getElementById("chat-input").value.trim();
    if (!txt || !currentChatId) return;
    fetch("/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            from: me.id,
            to: currentChatId,
            text: txt
        })
    });
    document.getElementById("chat-input").value = "";
}

// ==================== 活动结算 ====================
let activePid = null;
function openActivity(pid, name) {
    activePid = pid;
    document.getElementById("partner-name").innerText = name;
    document.getElementById("modal").style.display = "flex";
}

function closeModal(isWin) {
    if (isWin && activePid) {
        const currentSport = me.currentSport;
        if (currentSport) {
            if (!me.scores[currentSport]) {
                me.scores[currentSport] = 50;
            }
            me.scores[currentSport] += 10;
            localStorage.setItem("user", JSON.stringify(me));
            sendMeToServer();
            renderMe();
            renderMyMatches();
        } else {
            alert("请先设置当前运动");
        }
    }
    document.getElementById("modal").style.display = "none";
    activePid = null;
}

//------------------- 解除搭子关系 ------------------
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

//=================== 用户详情弹窗 ====================
function showUserDetail(pid) {
    let user = onlineUsers.find(u => u.id === pid);
    if (user) {
        showUserModal(user);
    } else {
        fetch("/data").then(r=>r.json()).then(data=>{
            const profile = data.userProfiles.find(p => p.id === pid);
            if (profile) {
                showUserModal(profile);
            } else {
                alert("用户信息不存在");
            }
        });
    }
}

function showUserModal(user) {
    let scoresHtml = "";
    if (user.scores && Object.keys(user.scores).length > 0) {
        scoresHtml = "<p><strong>各项积分：</strong></p><ul style='text-align:left;'>";
        for (const [sport, score] of Object.entries(user.scores)) {
            scoresHtml += `<li>${sport}: ${score}分</li>`;
        }
        scoresHtml += "</ul>";
    } else {
        scoresHtml = "<p>暂无运动记录</p>";
    }
    
    document.getElementById("user-detail-content").innerHTML = `
        <p><strong>昵称：</strong>${user.name}</p>
        <p><strong>性别：</strong>${user.gender}</p>
        <p><strong>当前运动：</strong>${user.currentSport || "未选择"}</p>
        <p><strong>当前状态：</strong>${user.currentStatus || "在线"}</p>
        ${scoresHtml}
    `;
    document.getElementById("user-detail-modal").style.display = "flex";
}

//=================== 关闭用户详情弹窗 ====================
function closeUserDetailModal() {
    document.getElementById("user-detail-modal").style.display = "none";
}

//=================== 筛选功能 ====================
let currentFilterSport = "";
let currentFilterStatus = "";
let currentFilterScore = "";

function applyFilter() {
    currentFilterSport = document.getElementById("filter-sport").value;
    currentFilterStatus = document.getElementById("filter-status").value;
    currentFilterScore = document.getElementById("filter-score").value;
    renderOnlineUsers();
}

function getFilteredUsers() {
    let list = onlineUsers.filter(u => u.id !== me.id);
    
    if (currentFilterSport) {
        list = list.filter(u => u.currentSport === currentFilterSport);
    }
    
    if (currentFilterStatus) {
        list = list.filter(u => u.currentStatus === currentFilterStatus);
    }
    
    if (currentFilterScore) {
        list = list.filter(u => {
            const totalScore = u.scores ? Object.values(u.scores).reduce((a,b) => a + b, 0) : 0;
            switch(currentFilterScore) {
                case "0-100": return totalScore >= 0 && totalScore <= 100;
                case "100-300": return totalScore > 100 && totalScore <= 300;
                case "300-600": return totalScore > 300 && totalScore <= 600;
                case "600-1500": return totalScore > 600 && totalScore <= 1500;
                case "1500-3000": return totalScore > 1500 && totalScore <= 3000;
                case "3000+": return totalScore > 3000;
                default: return true;
            }
        });
    }
    
    return list;
}



function openStatusModal() {
    const sports = ["足球", "篮球", "羽毛球", "游泳", "王者荣耀", "瓦罗兰特", "LOL", "钢琴", "吉他", "古筝"];
    const sportOptions = sports.map(s => `<option value="${s}" ${me.currentSport === s ? "selected" : ""}>${s}</option>`).join("");
    const statusOptions = ["在线", "等待匹配", "游戏中", "休息中"].map(s => `<option value="${s}" ${me.currentStatus === s ? "selected" : ""}>${s}</option>`).join("");
    
    const modalHtml = `
        <div id="status-modal" class="modal" style="display:flex;">
            <div class="modal-content">
                <h3>设置当前状态</h3>
                <p>我想玩：</p>
                <select id="sport-select" style="width:100%;padding:8px;margin:10px 0;">${sportOptions}</select>
                <p>状态：</p>
                <select id="status-select" style="width:100%;padding:8px;margin:10px 0;">${statusOptions}</select>
                <div style="display:flex;gap:10px;margin-top:20px;">
                    <button onclick="saveStatus()" class="btn-main">保存</button>
                    <button onclick="closeStatusModal()" class="btn-lose">取消</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
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
}

function closeStatusModal() {
    const modal = document.getElementById("status-modal");
    if (modal) modal.remove();
}

