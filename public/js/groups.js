// groups.js - 群聊大厅页面专用

let me = null;
let groups = [];

window.onload = () => {
    const saved = localStorage.getItem("user");
    if (saved) {
        me = JSON.parse(saved);
        loadGroups();
    }
    setInterval(loadGroups, 5000);
};

function loadGroups() {
    fetch("/groups")
        .then(r => r.json())
        .then(data => {
            groups = data;
            renderGroupList();
        })
        .catch(err => console.error("加载群聊失败:", err));
}

function renderGroupList() {
    const container = document.getElementById("group-list");
    if (!container) return;
    
    let filteredGroups = [...groups];
    if (groupSearchKeyword) {
        filteredGroups = filteredGroups.filter(group => 
            group.groupName.toLowerCase().includes(groupSearchKeyword) ||
            group.sport.toLowerCase().includes(groupSearchKeyword)
        );
    }

    if (filteredGroups.length === 0) {
        container.innerHTML = "<p style='text-align:center;color:#999;padding:50px;'>暂无群聊，快来创建一个吧</p>";
        return;
    }
    
    container.innerHTML = "";
    groups.forEach(group => {
        const isMember = group.members.some(m => m.id === me.id);
        const div = document.createElement("div");
        div.className = "group-card";
        div.innerHTML = `
            <div class="group-name">${group.groupName}</div>
            <div style="font-size:14px;color:#5b78f5;">🏷️ ${group.sport}</div>
            <div class="group-info">
                <span>👤 创建者：${group.creatorName}</span>
                <span>👥 ${group.members.length}人</span>
            </div>
            <div style="margin-top:12px;">
                ${isMember ? 
                    `<button onclick="openGroupChat(${group.id})" style="background:#5b78f5;padding:8px 16px;">💬 进入聊天</button>
                     <button onclick="leaveGroup(${group.id})" style="background:#e74c3c;padding:8px 16px;margin-left:8px;">退出</button>` : 
                    `<button onclick="joinGroup(${group.id})" style="background:#2ecc71;padding:8px 16px;">➕ 加入群聊</button>`
                }
            </div>
        `;
        container.appendChild(div);
    });
}

function openCreateGroup() {
    document.getElementById("create-group-modal").style.display = "flex";
}

function closeCreateModal() {
    document.getElementById("create-group-modal").style.display = "none";
}

function createGroup() {
    const groupName = document.getElementById("group-name").value.trim();
    const sport = document.getElementById("group-sport").value;
    
    if (!groupName) {
        alert("请输入群名称");
        return;
    }
    
    fetch("/group/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            groupName: groupName,
            creatorId: me.id,
            creatorName: me.name,
            sport: sport
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            closeCreateModal();
            document.getElementById("group-name").value = "";
            loadGroups();
            alert("群聊创建成功！");
        }
    });
}

function joinGroup(groupId) {
    fetch("/group/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            groupId: groupId,
            userId: me.id,
            userName: me.name
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert("已加入群聊");
            loadGroups();
        } else {
            alert("加入失败");
        }
    });
}

function leaveGroup(groupId) {
    if (confirm("确定要退出这个群聊吗？")) {
        fetch("/group/leave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                groupId: groupId,
                userId: me.id
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert("已退出群聊");
                loadGroups();
            }
        });
    }
}

function openGroupChat(groupId) {
    // 跳转到群聊聊天页面
    localStorage.setItem("currentGroupId", groupId);
    window.location.href = "group-chat.html";
}

// 搜索关键词
let groupSearchKeyword = "";

// 搜索群聊
function searchGroups() {
    groupSearchKeyword = document.getElementById("group-search").value.trim().toLowerCase();
    renderGroupList();
}