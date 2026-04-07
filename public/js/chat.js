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
    fetch("/online", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(me)
    });
}

function loadChatData() {
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            chatRecords = data.chatRecords || {};
            buildContactList();
            renderContactList();
        });
}

function syncChatData() {
    if (!me) return;
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            chatRecords = data.chatRecords || {};
            buildContactList();
            renderContactList();
            if (currentChatId) {
                renderChatMessages();
            }
        });
}

function buildContactList() {
    // 从聊天记录中提取所有与当前用户聊过的人
    const contactSet = new Set();
    for (const [key, messages] of Object.entries(chatRecords)) {
        const [id1, id2] = key.split("-");
        if (id1 === me.id) contactSet.add(id2);
        if (id2 === me.id) contactSet.add(id1);
    }
    
    // 同时从搭子列表中获取联系人
    fetch("/data")
        .then(r => r.json())
        .then(data => {
            const matches = data.matches || [];
            const myMatches = matches.filter(m => m.p1 === me.id || m.p2 === me.id);
            myMatches.forEach(m => {
                const pid = m.p1 === me.id ? m.p2 : m.p1;
                contactSet.add(pid);
            });
            
            // 获取联系人详细信息
            const allUsers = [...data.onlineUsers, ...data.userProfiles];
            const uniqueUsers = allUsers.filter((u, index, self) => 
                index === self.findIndex(t => t.id === u.id)
            );
            
            contacts = [];
            for (const id of contactSet) {
                const user = uniqueUsers.find(u => u.id === id);
                if (user) {
                    // 获取最后一条消息
                    const key = [me.id, id].sort().join("-");
                    const messages = chatRecords[key] || [];
                    const lastMsg = messages[messages.length - 1];
                    contacts.push({
                        id: user.id,
                        name: user.name,
                        lastMessage: lastMsg ? lastMsg.text : "",
                        lastTime: lastMsg ? lastMsg.t : 0
                    });
                }
            }
            
            // 按最后消息时间排序
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
        if (currentChatId === contact.id) div.classList.add("active");
        div.innerHTML = `
            <div class="chat-contact-name">${contact.name}</div>
            <div class="chat-contact-preview">${contact.lastMessage ? contact.lastMessage.substring(0, 30) : "暂无消息"}</div>
        `;
        div.onclick = () => openChat(contact.id, contact.name);
        container.appendChild(div);
    });
}

function openChat(pid, name) {
    currentChatId = pid;
    currentChatName = name;
    
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
        div.innerHTML = `<div>${msg.text}</div><div style="font-size:10px;opacity:0.7;">${time}</div>`;
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
        // 等待同步后刷新
        setTimeout(() => {
            syncChatData();
        }, 100);
    });
}

// 支持回车发送
document.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && document.getElementById("chat-input") === document.activeElement) {
        sendMessage();
    }
});