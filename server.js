const express = require("express");
const fs = require("fs");  // 新增
const app = express();
app.use(express.json());
app.use(express.static(__dirname + "/public"));

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
    parties: []
};

if (fs.existsSync(DATA_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        data = saved;
        // 确保所有字段都存在（防止旧数据缺少字段）
        if (!data.history) data.history = [];
        if (!data.parties) data.parties = [];  // ← 添加这行
        if (!data.chatRecords) data.chatRecords = {};  // ← 添加这行（可选）
        if (!data.onlineUsers) data.onlineUsers = [];  // ← 添加这行（可选）
        if (!data.userProfiles) data.userProfiles = [];  // ← 添加这行（可选）
        if (!data.invites) data.invites = [];  // ← 添加这行（可选）
        if (!data.matches) data.matches = [];  // ← 添加这行（可选）
        console.log("✅ 已加载历史数据");
    } catch(e) {
        console.log("加载数据失败，使用默认数据");
    }
}

// 保存数据函数
function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("💾 数据已保存");
}




// 路由配置
app.get("/", (req, res) => res.sendFile("pages/square.html", { root: __dirname + "/public" }));
app.get("/square.html", (req, res) => res.sendFile("pages/square.html", { root: __dirname + "/public" }));
app.get("/party.html", (req, res) => res.sendFile("pages/party.html", { root: __dirname + "/public" }));
app.get("/profile.html", (req, res) => res.sendFile("pages/profile.html", { root: __dirname + "/public" }));
app.get("/chat.html", (req, res) => res.sendFile("pages/chat.html", { root: __dirname + "/public" }));
app.get("/activity.html", (req, res) => res.sendFile("pages/activity.html", { root: __dirname + "/public" }));
app.get("/register.html", (req, res) => res.sendFile("pages/register.html", { root: __dirname + "/public" }));
app.get("/nav.html", (req, res) => res.sendFile("pages/nav.html", { root: __dirname + "/public" }));
app.get("/data", (req, res) => res.json(data));

app.post("/online", (req, res) => {
    const u = req.body;
    u.t = Date.now();
    const idx = data.onlineUsers.findIndex(x => x.id === u.id);
    if (idx >= 0) data.onlineUsers[idx] = u;
    else data.onlineUsers.push(u);
    
    // 保存用户档案
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

// 退出约局
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

// 取消约局
app.post("/party/cancel", (req, res) => {
    const { partyId, userId } = req.body;
    const party = data.parties.find(p => p.id === partyId);
    if (party && party.creator === userId) {
        data.parties = data.parties.filter(p => p.id !== partyId);
        saveData();
    }
    res.sendStatus(200);
});

app.listen(8080, () => console.log("校搭联机服务器启动：http://localhost:8080"));