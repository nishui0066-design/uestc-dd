// party.js - 约局大厅页面专用

let me = null;
let parties = [];

// 页面加载
window.onload = () => {
    const saved = localStorage.getItem("user");
    if (saved) {
        me = JSON.parse(saved);
        if (!me.scores) me.scores = {};
        if (!me.currentSport) me.currentSport = null;
        if (!me.currentStatus) me.currentStatus = "在线";
        refreshParties();
        sendMeToServer();
    }
    setInterval(syncParties, 3000);
};

function sendMeToServer() {
    fetch("/online", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(me)
    });
}

function syncParties() {
    if (!me) return;
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            parties = data.parties || [];
            renderParties();
        })
        .catch(err => console.error("同步失败:", err));
}

function refreshParties() {
    if (!me) return;
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            parties = data.parties || [];
            renderParties();
        })
        .catch(err => console.error("刷新失败:", err));
}

// 筛选变量
let currentPartyFilterSport = "";
let currentPartyFilterStatus = "";

function filterParties() {
    currentPartyFilterSport = document.getElementById("party-filter-sport").value;
    currentPartyFilterStatus = document.getElementById("party-filter-status").value;
    renderParties();
}

function resetPartyFilter() {
    document.getElementById("party-filter-sport").value = "";
    document.getElementById("party-filter-status").value = "";
    document.getElementById("party-search").value = "";
    currentPartyFilterSport = "";
    currentPartyFilterStatus = "";
    partySearchKeyword = "";
    renderParties();
}

function renderParties() {
    const box = document.getElementById("party-list");
    if (!box) return;
    
    let filteredParties = [...parties];
    if (currentPartyFilterSport) {
        filteredParties = filteredParties.filter(p => p.sport === currentPartyFilterSport);
    }
    if (currentPartyFilterStatus) {
        filteredParties = filteredParties.filter(p => p.status === currentPartyFilterStatus);
    }
    
    // 搜索过滤
    if (partySearchKeyword) {
        filteredParties = filteredParties.filter(p => 
            p.location.toLowerCase().includes(partySearchKeyword) ||
            p.sport.toLowerCase().includes(partySearchKeyword) ||
            p.creatorName.toLowerCase().includes(partySearchKeyword)
        );
    }

    if (filteredParties.length === 0) {
        box.innerHTML = "<p>暂无约局，快来发起一个吧</p>";
        return;
    }
    
    box.innerHTML = "";
    filteredParties.forEach(p => {
        const div = document.createElement("div");
        div.className = "party-card";
        div.style.cursor = "pointer";
        div.onclick = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            window.location.href = `/party-detail.html?id=${p.id}`;
        };

        const isJoined = p.players.includes(me.id);
        const isCreator = p.creator === me.id;
        
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                <strong style="font-size:18px;">⚽ ${p.sport}</strong>
                <span style="color:${p.status === '招募中' ? '#2ecc71' : '#95a5a6'}">${p.status}</span>
            </div>
            <div style="display:flex;gap:15px;margin-bottom:10px;flex-wrap:wrap;">
                <span>👤 发起人：${p.creatorName}</span>
                <span>📍 ${p.location}</span>
                <span>⏰ ${new Date(p.time).toLocaleString()}</span>
                <span>👥 ${p.players.length}/10人</span>
            </div>
            <div style="display:flex;gap:10px;margin-top:10px;">
                ${isCreator ? 
                    `<button onclick="cancelParty(${p.id})" style="background:#e74c3c;padding:8px 15px;">取消约局</button>` : 
                    (isJoined ? 
                        `<button onclick="leaveParty(${p.id})" style="background:#e74c3c;padding:8px 15px;">退出约局</button>` : 
                        `<button onclick="joinParty(${p.id})" style="background:#5b78f5;padding:8px 15px;" ${p.status !== '招募中' ? 'disabled' : ''}>${p.status === '招募中' ? '报名参加' : '已结束'}</button>`
                    )
                }
            </div>
        `;
        box.appendChild(div);
    });
}

function openCreateParty() {
    document.getElementById("party-modal").style.display = "flex";
}

function closePartyModal() {
    document.getElementById("party-modal").style.display = "none";
}

function createParty() {
    const sport = document.getElementById("party-sport").value;
    const time = document.getElementById("party-time").value;
    const location = document.getElementById("party-location").value.trim();
    
    if (!time || !location) {
        alert("请填写完整信息");
        return;
    }
    
    const party = {
        id: Date.now(),
        creator: me.id,
        creatorName: me.name,
        sport: sport,
        time: time,
        location: location,
        players: [me.id],
        status: "招募中"
    };
    
    fetch("/party/create", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(party)
    }).then(() => {
        closePartyModal();
        document.getElementById("party-time").value = "";
        document.getElementById("party-location").value = "";
        refreshParties();
        alert("约局发布成功！");
    });
}

function joinParty(partyId) {
    fetch("/party/join", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ partyId: partyId, userId: me.id, userName: me.name })
    }).then(() => {
        refreshParties();
        alert("报名成功！");
    });
}

function leaveParty(partyId) {
    if (confirm("确定要退出这个约局吗？")) {
        fetch("/party/leave", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ partyId: partyId, userId: me.id })
        }).then(() => {
            refreshParties();
            alert("已退出约局");
        });
    }
}

function cancelParty(partyId) {
    if (confirm("确定要取消这个约局吗？取消后无法恢复！")) {
        fetch("/party/cancel", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ partyId: partyId, userId: me.id })
        }).then(() => {
            refreshParties();
            alert("约局已取消");
        });
    }
}

// 搜索关键词
let partySearchKeyword = "";

// 搜索约局
function searchParties() {
    partySearchKeyword = document.getElementById("party-search").value.trim().toLowerCase();
    renderParties();
}