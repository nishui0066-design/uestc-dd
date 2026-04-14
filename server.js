const express = require("express");
const fs = require("fs");
const app = express();
app.use(express.json());

// 数据文件路径
const DATA_FILE = "./data.json";

// 读取保存的数据
let data = {
    onlineUsers: [],
    userProfiles: [],
    invites: [],
    matches: [],
    chatRecords: {},
    history: [],
    parties: [],
    groups: []
};

if (fs.existsSync(DATA_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        data = saved;
        if (!data.history) data.history = [];
        if (!data.parties) data.parties = [];
        if (!data.chatRecords) data.chatRecords = {};
        if (!data.onlineUsers) data.onlineUsers = [];
        if (!data.userProfiles) data.userProfiles = [];
        if (!data.invites) data.invites = [];
        if (!data.matches) data.matches = [];
        if (!data.groups) data.groups = [];
        console.log("✅ 已加载历史数据");
    } catch(e) {
        console.log("加载数据失败，使用默认数据");
    }
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("💾 数据已保存");
}

// ========== 静态文件（必须放在API路由之前） ==========

// 获取单个约局详情（必须放在 static 之前）
app.get("/api/party/:id", (req, res) => {
    const partyId = parseInt(req.params.id);
    const party = data.parties.find(p => p.id === partyId);
    if (party) {
        const membersWithInfo = party.players.map(pid => {
            const user = data.userProfiles.find(u => u.id === pid);
            return user || { id: pid, name: "未知用户" };
        });
        res.json({ ...party, membersDetail: membersWithInfo });
    } else {
        res.status(404).json({ error: "约局不存在" });
    }
});

// ========== 页面路由 ==========
app.get("/", (req, res) => res.sendFile("pages/square.html", { root: __dirname + "/public" }));
app.get("/square.html", (req, res) => res.sendFile("pages/square.html", { root: __dirname + "/public" }));
app.get("/match.html", (req, res) => res.sendFile("pages/match.html", { root: __dirname + "/public" }));
app.get("/party.html", (req, res) => res.sendFile("pages/party.html", { root: __dirname + "/public" }));
app.get("/profile.html", (req, res) => res.sendFile("pages/profile.html", { root: __dirname + "/public" }));
app.get("/chat.html", (req, res) => res.sendFile("pages/chat.html", { root: __dirname + "/public" }));
app.get("/activity.html", (req, res) => res.sendFile("pages/activity.html", { root: __dirname + "/public" }));
app.get("/register.html", (req, res) => res.sendFile("pages/register.html", { root: __dirname + "/public" }));
app.get("/nav.html", (req, res) => res.sendFile("pages/nav.html", { root: __dirname + "/public" }));
app.get("/groups.html", (req, res) => res.sendFile("pages/groups.html", { root: __dirname + "/public" }));
app.get("/group-chat.html", (req, res) => res.sendFile("pages/group-chat.html", { root: __dirname + "/public" }));
app.get("/party-detail.html", (req, res) => res.sendFile("pages/party-detail.html", { root: __dirname + "/public" }));
app.get("/admin-login.html", (req, res) => res.sendFile("pages/admin-login.html", { root: __dirname + "/public" }));
app.get("/admin.html", (req, res) => res.sendFile("pages/admin.html", { root: __dirname + "/public" }));
app.get("/manifest.json", (req, res) => res.sendFile("manifest.json", { root: __dirname + "/public" }));
app.get("/sw.js", (req, res) => res.sendFile("sw.js", { root: __dirname + "/public" }));

app.use(express.static(__dirname + "/public"));

// ========== API 路由 ==========

app.get("/data", (req, res) => res.json(data));
app.get("/groups", (req, res) => res.json(data.groups || []));

app.post("/online", (req, res) => {
    const u = req.body;
    
    // 处理删除用户
    if (u.delete) {
        data.onlineUsers = data.onlineUsers.filter(user => user.id !== u.id);
        data.userProfiles = data.userProfiles.filter(user => user.id !== u.id);
        data.parties.forEach(party => {
            if (party.players) {
                party.players = party.players.filter(id => id !== u.id);
            }
        });
        data.matches = data.matches.filter(match => {
            return match.p1 !== u.id && match.p2 !== u.id;
        });
        saveData();
        res.sendStatus(200);
        return;
    }
    
    u.t = Date.now();
    const idx = data.onlineUsers.findIndex(x => x.id === u.id);
    if (idx >= 0) data.onlineUsers[idx] = u;
    else data.onlineUsers.push(u);
    
    const profileIdx = data.userProfiles.findIndex(p => p.id === u.id);
    if (profileIdx >= 0) data.userProfiles[profileIdx] = u;
    else data.userProfiles.push(u);
    
    saveData();
    res.sendStatus(200);
});

app.post("/invite", (req, res) => {
    data.invites.push(req.body);
    saveData();
    res.sendStatus(200);
});

app.post("/invite/clear", (req, res) => {
    data.invites = data.invites.filter(i => i.to !== req.body.to);
    saveData();
    res.sendStatus(200);
});

app.post("/match", (req, res) => {
    const { p1, p2 } = req.body;
    const alreadyExists = data.matches.some(m => 
        (m.p1 === p1 && m.p2 === p2) || 
        (m.p1 === p2 && m.p2 === p1)
    );
    if (!alreadyExists) {
        data.matches.push({ p1, p2 });
        saveData();
    }
    res.sendStatus(200);
});

app.post("/chat", (req, res) => {
    const {from,to,text} = req.body;
    const key = [from,to].sort().join("-");
    if (!data.chatRecords[key]) data.chatRecords[key] = [];
    data.chatRecords[key].push({from,to,text,t:Date.now()});
    saveData();
    res.sendStatus(200);
});

app.post("/offline", (req, res) => {
    const { id } = req.body;
    data.onlineUsers = data.onlineUsers.filter(u => u.id !== id);
    saveData();
    res.sendStatus(200);
});

app.post("/match/remove", (req, res) => {
    const { me, partner } = req.body;
    data.matches = data.matches.filter(m => 
        !(m.p1 === me && m.p2 === partner) && 
        !(m.p1 === partner && m.p2 === me)
    );
    saveData();
    res.sendStatus(200);
});

app.post("/history/add", (req, res) => {
    data.history.push(req.body);
    saveData();
    res.sendStatus(200);
});

app.post("/party/create", (req, res) => {
    const newParty = {
        ...req.body,
        players: req.body.players || [],
        invites: req.body.invites || []
    };
    data.parties.push(newParty);
    saveData();
    res.sendStatus(200);
});

app.post("/party/join", (req, res) => {
    const { partyId, userId, userName } = req.body;
    const party = data.parties.find(p => p.id === partyId);
    if (party) {
        if (!party.players) party.players = [];
        if (!party.players.includes(userId)) {
            party.players.push(userId);
            if (party.players.length >= 10) {
                party.status = "已结束";
            }
            saveData();
        }
    }
    res.sendStatus(200);
});

app.post("/party/leave", (req, res) => {
    const { partyId, userId } = req.body;
    const party = data.parties.find(p => p.id === partyId);
    if (party && party.players.includes(userId)) {
        party.players = party.players.filter(id => id !== userId);
        if (party.players.length === 0) {
            data.parties = data.parties.filter(p => p.id !== partyId);
        } else if (party.creator === userId && party.players.length > 0) {
            party.creator = party.players[0];
            const newCreator = data.userProfiles.find(u => u.id === party.players[0]);
            if (newCreator) party.creatorName = newCreator.name;
        }
        saveData();
    }
    res.sendStatus(200);
});

app.post("/party/cancel", (req, res) => {
    const { partyId, userId } = req.body;
    const party = data.parties.find(p => p.id === partyId);
    if (party && party.creator === userId) {
        data.parties = data.parties.filter(p => p.id !== partyId);
        saveData();
    }
    res.sendStatus(200);
});

app.post("/smart-match", (req, res) => {
    const { userId } = req.body;
    const user = data.userProfiles.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: "用户不存在" });
    }
    
    let candidates = data.onlineUsers.filter(u => u.id !== userId);
    const scored = candidates.map(candidate => {
        let score = 0;
        if (candidate.currentSport && user.currentSport && 
            candidate.currentSport === user.currentSport) {
            score += 50;
        }
        const userTotal = user.scores ? Object.values(user.scores).reduce((a,b) => (a||0)+(b||0), 0) : 0;
        const candTotal = candidate.scores ? Object.values(candidate.scores).reduce((a,b) => (a||0)+(b||0), 0) : 0;
        const diff = Math.abs(userTotal - candTotal);
        if (diff < 100) score += 30;
        else if (diff < 300) score += 20;
        else if (diff < 500) score += 10;
        if (candidate.currentStatus === "等待匹配") score += 20;
        else if (candidate.currentStatus === "在线") score += 10;
        const isMatched = data.matches.some(m => 
            (m.p1 === userId && m.p2 === candidate.id) || 
            (m.p1 === candidate.id && m.p2 === userId)
        );
        if (isMatched) score += 15;
        if (candidate.t) {
            const minutesAgo = (Date.now() - candidate.t) / 60000;
            if (minutesAgo < 5) score += 15;
            else if (minutesAgo < 15) score += 10;
            else if (minutesAgo < 30) score += 5;
        }
        return { ...candidate, matchScore: score };
    });
    scored.sort((a, b) => b.matchScore - a.matchScore);
    res.json(scored.slice(0, 10));
});

app.post("/group/create", (req, res) => {
    const { groupName, creatorId, creatorName, sport } = req.body;
    const newGroup = {
        id: Date.now(),
        groupName: groupName,
        creatorId: creatorId,
        creatorName: creatorName,
        sport: sport || "综合",
        members: [{ id: creatorId, name: creatorName }],
        messages: [],
        createdAt: Date.now()
    };
    data.groups.push(newGroup);
    saveData();
    res.json({ success: true, groupId: newGroup.id });
});

app.post("/group/join", (req, res) => {
    const { groupId, userId, userName } = req.body;
    const group = data.groups.find(g => String(g.id) === String(groupId));
    if (group && !group.members.some(m => m.id === userId)) {
        group.members.push({ id: userId, name: userName });
        saveData();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "无法加入群聊" });
    }
});

app.post("/group/leave", (req, res) => {
    const { groupId, userId } = req.body;
    const group = data.groups.find(g => String(g.id) === String(groupId));
    if (group) {
        group.members = group.members.filter(m => m.id !== userId);
        if (group.members.length === 0) {
            data.groups = data.groups.filter(g => g.id !== groupId);
        }
        saveData();
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.post("/group/message", (req, res) => {
    const { groupId, userId, userName, text } = req.body;
    const group = data.groups.find(g => String(g.id) === String(groupId));
    if (group) {
        group.messages.push({
            fromId: userId,
            fromName: userName,
            text: text,
            time: Date.now()
        });
        saveData();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "群组不存在" });
    }
});

app.post("/unread/private", (req, res) => {
    const { userId } = req.body;
    let unreadCount = 0;
    for (const [key, messages] of Object.entries(data.chatRecords)) {
        const [id1, id2] = key.split("-");
        if (id2 === userId) {
            const lastRead = data.lastRead?.[userId]?.[id1] || 0;
            const newMessages = messages.filter(m => m.from === id1 && m.t > lastRead);
            unreadCount += newMessages.length;
        }
    }
    res.json({ count: unreadCount });
});

app.post("/unread/group", (req, res) => {
    const { userId } = req.body;
    let unreadCount = 0;
    for (const group of data.groups) {
        if (group.members.some(m => m.id === userId)) {
            const lastRead = data.groupLastRead?.[userId]?.[group.id] || 0;
            const newMessages = group.messages.filter(m => m.time > lastRead);
            unreadCount += newMessages.length;
        }
    }
    res.json({ count: unreadCount });
});

app.post("/read/private", (req, res) => {
    const { userId, fromId } = req.body;
    if (!data.lastRead) data.lastRead = {};
    if (!data.lastRead[userId]) data.lastRead[userId] = {};
    data.lastRead[userId][fromId] = Date.now();
    saveData();
    res.json({ success: true });
});

app.post("/read/group", (req, res) => {
    const { userId, groupId } = req.body;
    if (!data.groupLastRead) data.groupLastRead = {};
    if (!data.groupLastRead[userId]) data.groupLastRead[userId] = {};
    data.groupLastRead[userId][groupId] = Date.now();
    saveData();
    res.json({ success: true });
});

app.post("/chat/conversations", (req, res) => {
    const { userId } = req.body;
    const conversations = [];
    const userMap = new Map();
    for (const user of data.userProfiles) {
        userMap.set(user.id, user);
    }
    for (const [key, messages] of Object.entries(data.chatRecords)) {
        const [id1, id2] = key.split("-");
        let otherId = null;
        if (id1 === userId) otherId = id2;
        if (id2 === userId) otherId = id1;
        if (otherId) {
            const lastMessage = messages[messages.length - 1];
            const lastRead = data.lastRead?.[userId]?.[otherId] || 0;
            const unreadCount = messages.filter(m => m.from === otherId && m.t > lastRead).length;
            const otherUser = userMap.get(otherId) || { name: "未知用户", id: otherId };
            conversations.push({
                otherId: otherId,
                otherName: otherUser.name,
                lastMessage: lastMessage?.text || "",
                lastTime: lastMessage?.t || 0,
                unreadCount: unreadCount
            });
        }
    }
    conversations.sort((a, b) => b.lastTime - a.lastTime);
    res.json(conversations);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`校搭联机服务器启动：http://localhost:${PORT}`));