// chat.js - 消息页面专用

let me = null;
let chatRecords = {};
let currentChatId = null;
let currentChatName = null;
let contacts = [];

// 页面加载
window.onload = () => {
    const saved = localStorage.getItem("user");
    if (saved) {
        me = JSON.parse(saved);
        loadChatData();
        sendMeToServer();
        
        // 检查是否有从其他页面传来的打开聊天请求
        const openChatWith = localStorage.getItem("openChatWith");
        if (openChatWith) {
            const target = JSON.parse(openChatWith);
            setTimeout(() => {
                openChat(target.id, target.name);
                localStorage.removeItem("openChatWith");
            }, 500);
        }
    }
    setInterval(syncChatData, 3000);
};

function sendMeToServer() {
    const saved = localStorage.getItem("user");
    if (!saved) return;
    const user = JSON.parse(saved);
    fetch("/online", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(user)
    });
}
function loadChatData() {
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            chatRecords = data.chatRecords || {};
            buildContactList();
        });
}

function syncChatData() {
    if (!me) return;
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            chatRecords = data.chatRecords || {};
            buildContactList();
            if (currentChatId) {
                renderChatMessages();
            }
        });
}

function buildContactList() {
    fetch("/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id })
    })
    .then(r => r.json())
    .then(conversations => {
        contacts = conversations;
        renderContactList();
    })
    .catch(err => {
        console.error("获取会话列表失败:", err);
        // 降级方案：从聊天记录构建
        buildContactListFromLocal();
    });
}

// 降级方案：从本地聊天记录构建联系人列表
function buildContactListFromLocal() {
    const contactMap = new Map();
    
    for (const [key, messages] of Object.entries(chatRecords)) {
        const [id1, id2] = key.split("-");
        const otherId = id1 === me.id ? id2 : id1;
        
        if (!contactMap.has(otherId)) {
            contactMap.set(otherId, {
                otherId: otherId,
                otherName: "加载中...",
                lastMessage: "",
                lastTime: 0,
                unreadCount: 0
            });
        }
        
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.t > contactMap.get(otherId).lastTime) {
            const contact = contactMap.get(otherId);
            contact.lastMessage = lastMsg.text;
            contact.lastTime = lastMsg.t;
        }
    }
    
    // 获取用户名
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            const allUsers = [...data.onlineUsers, ...data.userProfiles];
            for (const contact of contactMap.values()) {
                const user = allUsers.find(u => u.id === contact.otherId);
                if (user) contact.otherName = user.name;
            }
            contacts = Array.from(contactMap.values());
            contacts.sort((a, b) => b.lastTime - a.lastTime);
            renderContactList();
        });
}

function renderContactList() {
    const container = document.getElementById("chat-contact-list");
    if (!container) return;
    
    if (contacts.length === 0) {
        container.innerHTML = "<div style='padding:15px;text-align:center;color:#999'>暂无聊天记录</div>";
        return;
    }
    
    container.innerHTML = "";
    contacts.forEach(contact => {
        const div = document.createElement("div");
        div.className = "chat-contact";
        if (currentChatId === contact.otherId) div.classList.add("active");
        
        const time = contact.lastTime ? new Date(contact.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
        
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div class="chat-contact-name">${contact.otherName}</div>
                <div style="font-size:10px;color:#999;">${time}</div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div class="chat-contact-preview">${contact.lastMessage ? contact.lastMessage.substring(0, 30) : "暂无消息"}</div>
                ${contact.unreadCount > 0 ? `<span style="background:#e74c3c;color:white;padding:2px 8px;border-radius:20px;font-size:10px;">${contact.unreadCount}</span>` : ''}
            </div>
        `;
        div.onclick = () => openChat(contact.otherId, contact.otherName);
        container.appendChild(div);
    });
}

function openChat(pid, name) {
    currentChatId = pid;
    currentChatName = name;
    
    // 标记已读
    fetch("/read/private", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id, fromId: pid })
    });
    
    // 更新UI
    document.getElementById("chat-header").innerHTML = `💬 与 ${name} 聊天`;
    document.getElementById("chat-input-area").style.display = "flex";
    
    // 高亮当前联系人
    renderContactList();
    
    // 渲染消息
    renderChatMessages();
}

function renderChatMessages() {
    if (!currentChatId) return;
    
    const key = [me.id, currentChatId].sort().join("-");
    const messages = chatRecords[key] || [];
    const container = document.getElementById("chat-messages");
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="empty-chat">暂无消息，发送一条吧~</div>';
        return;
    }
    
    container.innerHTML = "";
    messages.forEach(msg => {
        const div = document.createElement("div");
        div.className = "chat-msg " + (msg.from === me.id ? "me" : "other");
        const time = new Date(msg.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = `<div>${escapeHtml(msg.text)}</div><div style="font-size:10px;opacity:0.7;">${time}</div>`;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    
    if (!text || !currentChatId) return;
    
    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            from: me.id,
            to: currentChatId,
            text: text
        })
    }).then(() => {
        input.value = "";
        setTimeout(() => {
            syncChatData();
        }, 100);
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// 支持回车发送
document.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && document.getElementById("chat-input") === document.activeElement) {
        sendMessage();
    }
});