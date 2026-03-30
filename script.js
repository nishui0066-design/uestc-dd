// ==================== 联机版校搭系统 ====================
// 无假人、真实邀请、真实聊天、仅本人可见通知
// ======================================================

const subData = {
    "运动": ["足球", "篮球", "羽毛球", "游泳"],
    "游戏": ["王者荣耀", "瓦罗兰特", "LOL"],
    "乐器": ["钢琴", "吉他", "古筝"]
};

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
        document.getElementById("user-info-panel").style.display = "block";
        renderMe();
        refreshOnlineUsers();
        renderMyInvites();
        renderMyMatches();
    }
    setInterval(syncAll, 1000);
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

// 级联选择
function updateSub() {
    const main = document.getElementById("mainCat").value;
    const sub = document.getElementById("subCat");
    sub.innerHTML = "";
    sub.disabled = !main;
    if (main) subData[main].forEach(s => {
        const opt = document.createElement("option");
        opt.value = opt.text = s;
        sub.appendChild(opt);
    });
}

// 注册
function register() {
    const name = document.getElementById("username").value.trim();
    if (!name) return alert("请输入昵称");
    me = {
        id: userId,
        name: name,
        gender: document.getElementById("gender").value,
        main: document.getElementById("mainCat").value,
        sub: document.getElementById("subCat").value,
        score: 50
    };
    localStorage.user = JSON.stringify(me);
    document.getElementById("user-info-panel").style.display = "block";
    renderMe();
    sendMeToServer();
    alert("注册成功！已联网在线");
    refreshOnlineUsers();
}

function renderMe() {
    document.getElementById("info-name").innerText = me.name;
    document.getElementById("info-gender").innerText = me.gender;
    document.getElementById("info-category").innerText = me.main + " · " + me.sub;
    document.getElementById("info-score").innerText = me.score;
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

function renderOnlineUsers() {
    const box = document.getElementById("square");
    box.innerHTML = "";
    const list = onlineUsers.filter(u => u.id !== me.id);
    if (list.length === 0) {
        box.innerHTML = "<p>暂无其他在线用户</p>";
        return;
    }
    list.forEach(u => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h4>${u.name} (${u.gender})</h4>
            <p>${u.main} · ${u.sub}</p>
            <p>积分：${u.score}</p>
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
function renderMyInvites() {
    if (!me) return;
    const my = invites.filter(i => i.to === me.id);
    document.getElementById("req-count").innerText = my.length;
    const box = document.getElementById("incoming-requests");
    box.innerHTML = "";
    my.forEach(i => {
        const from = onlineUsers.find(u => u.id === i.from) || {name:"未知"};
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
    fetch("/match", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ p1: fromId, p2: me.id })
    }).then(()=>{
        fetch("/invite/clear", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ to: me.id })
        });
    });
}

// 渲染我的搭子
function renderMyMatches() {
    if (!me) return;
    const my = matches.filter(m => m.p1 === me.id || m.p2 === me.id);
    const box = document.getElementById("matched-list");
    box.innerHTML = "";
    my.forEach(m => {
        const pid = m.p1 === me.id ? m.p2 : m.p1;
        const user = onlineUsers.find(u => u.id === pid) || {name:"离线", score:0};
        const div = document.createElement("div");
        div.className = "req-item";
        div.innerHTML = `
            <span>${user.name} (${user.score}分)</span>
            <div style="display:flex;gap:6px">
                <button onclick="openChat('${pid}','${user.name}')">聊天</button>
                <button onclick="openActivity('${pid}','${user.name}')">🎮 活动</button>
            </div>
        `;
        box.appendChild(div);
    });
}

// 智能匹配
function smartMatch() {
    if (!me) return alert("请先注册");
    fetch("/data").then(r=>r.json()).then(data=>{
        const list = (data.onlineUsers||[]).filter(u=>
            u.id !== me.id && u.main === me.main
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
        me.score += 10;
        localStorage.user = JSON.stringify(me);
        sendMeToServer();
        renderMe();
    }
    document.getElementById("modal").style.display = "none";
    activePid = null;
}