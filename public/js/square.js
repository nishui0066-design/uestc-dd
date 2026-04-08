// square.js - 广场页面专用

let me = null;
let onlineUsers = [];

// 页面加载
window.onload = () => {
    const saved = localStorage.getItem("user");
    if (saved) {
        me = JSON.parse(saved);
        if (!me.scores) me.scores = {};
        if (!me.currentSport) me.currentSport = null;
        if (!me.currentStatus) me.currentStatus = "在线";
        refreshOnlineUsers();
        sendMeToServer();
    }
    setInterval(syncOnlineUsers, 3000);
    window.addEventListener("beforeunload", () => {
        fetch("/offline", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ id: me ? me.id : null })
        });
    });
};

function sendMeToServer() {
    fetch("/online", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(me)
    });
}

function syncOnlineUsers() {
    if (!me) return;
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            onlineUsers = data.onlineUsers || [];
            renderOnlineUsers();
        })
        .catch(err => console.error("同步失败:", err));
}

function refreshOnlineUsers() {
    if (!me) return alert("请先注册");
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            onlineUsers = data.onlineUsers || [];
            renderOnlineUsers();
        })
        .catch(err => {
            console.error("刷新失败:", err);
            alert("网络错误，请检查服务器是否运行");
        });
}

function renderOnlineUsers() {
    if (!me) return;
    const list = getFilteredUsers();
    const box = document.getElementById("square");
    if (!box) return;
    
    box.innerHTML = "";
    if (list.length === 0) {
        box.innerHTML = "<p>暂无符合条件的在线用户</p>";
        return;
    }
    
    list.forEach(u => {
        const card = document.createElement("div");
        card.className = "card";
        const totalScore = u.scores ? Object.values(u.scores).reduce((a, b) => (a || 0) + (b || 0), 0) : 0;
        const sportScore = (u.currentSport && u.scores && u.scores[u.currentSport]) ? u.scores[u.currentSport] : "—";
        const interestsText = u.interests && u.interests.length > 0 ? u.interests.join('、') : "未设置";
        card.innerHTML = `
            <h4>${u.name} (${u.gender}) <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${u.currentStatus === '在线' ? '#2ecc71' : (u.currentStatus === '等待匹配' ? '#f39c12' : (u.currentStatus === '游戏中' ? '#e74c3c' : '#95a5a6'))};margin-left:8px;"></span></h4>
            <p>🏆 ${getRank(totalScore)}</p>
            <p>🎮 ${u.currentSport || "未选择"} · ${u.currentStatus || "在线"}</p>
            <p>⭐ ${u.currentSport || "未选择"}积分：${sportScore}</p>
            <p>✨ 兴趣：${interestsText}</p>
            <button onclick="sendInvite('${u.id}')">邀请搭子</button>
            <button onclick="showUserDetail('${u.id}')">查看详情</button>
        `;
        box.appendChild(card);
    });
}

function sendInvite(toId) {
    if (!me) return;
    fetch("/invite", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ from: me.id, to: toId })
    }).then(() => alert("邀请已发送"));
}

function getRank(score) {
    if (score < 200) return "🥉 青铜";
    if (score < 500) return "🥈 白银";
    if (score < 1000) return "🥇 黄金";
    if (score < 2000) return "💎 铂金";
    if (score < 3500) return "🔮 钻石";
    return "👑 王者";
}

// 筛选功能
let currentFilterSport = "";
let currentFilterStatus = "";

function applyFilter() {
    currentFilterSport = document.getElementById("filter-sport").value;
    currentFilterStatus = document.getElementById("filter-status").value;
    renderOnlineUsers();
}

function getFilteredUsers() {
    let list = onlineUsers.filter(u => u.id !== me.id);
    if (currentFilterSport) {
        list = list.filter(u => 
            u.currentSport === currentFilterSport || 
            (u.interests && u.interests.includes(currentFilterSport))
        );
    }
    if (currentFilterStatus) {
        list = list.filter(u => u.currentStatus === currentFilterStatus);
    }
    list.sort((a, b) => {
        const scoreA = (a.currentSport && a.scores && a.scores[a.currentSport]) ? a.scores[a.currentSport] : 0;
        const scoreB = (b.currentSport && b.scores && b.scores[b.currentSport]) ? b.scores[b.currentSport] : 0;
        return scoreB - scoreA;
    });
    return list;
}

function smartMatch() {
    if (!me) return alert("请先注册");
    fetch("/data").then(r => r.json()).then(data => {
        const list = (data.onlineUsers || []).filter(u =>
            u.id !== me.id && u.currentSport === me.currentSport && u.currentSport
        );
        if (list.length === 0) {
            alert("没有找到同类型的在线用户");
            return;
        }
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
        list.forEach(u => {
            const card = document.createElement("div");
            card.style.cssText = "border:1px solid #ddd;border-radius:8px;padding:10px;margin-bottom:10px;";
            const sportScore = (u.currentSport && u.scores && u.scores[u.currentSport]) ? u.scores[u.currentSport] : "—";
            card.innerHTML = `
                <h4>${u.name} (${u.gender})</h4>
                <p>🎮 ${u.currentSport || "未选择"} · ${u.currentStatus || "在线"} | ${u.currentSport ? u.currentSport + "积分" : "积分"}:${sportScore}</p>
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
            let interestsHtml = "";
            if (user.interests && user.interests.length > 0) {
                interestsHtml = "<p><strong>兴趣爱好：</strong></p><ul>";
                user.interests.forEach(interest => {
                    interestsHtml += `<li>${interest}</li>`;
                });
                interestsHtml += "</ul>";
            } else {
                interestsHtml = "<p>暂无兴趣设置</p>";
            }
            document.getElementById("user-detail-content").innerHTML = `
                <p><strong>昵称：</strong>${user.name}</p>
                <p><strong>性别：</strong>${user.gender}</p>
                <p><strong>当前运动：</strong>${user.currentSport || "未选择"}</p>
                <p><strong>当前状态：</strong>${user.currentStatus || "在线"}</p>
                ${interestsHtml}
                ${scoresHtml}
            `;
            document.getElementById("user-detail-modal").style.display = "flex";
        } else {
            alert("用户信息不存在");
        }
    });
}

function closeUserDetailModal() {
    document.getElementById("user-detail-modal").style.display = "none";
}