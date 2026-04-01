const express = require("express");
const fs = require("fs");  // 新增
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// 数据文件路径
const DATA_FILE = "./data.json";

// 读取保存的数据
let data = {
    onlineUsers: [],
    userProfiles: [],
    invites: [],
    matches: [],
    chatRecords: {}
};

if (fs.existsSync(DATA_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        data = saved;
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




app.get("/", (req, res) => res.sendFile("index.html", { root: __dirname }));
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
    data.matches.push(req.body);
    saveData();
    res.sendStatus(200);
});

app.post("/match", (req, res) => {
    data.matches.push(req.body);
    saveData();
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
    res.sendStatus(200);
});

app.post("/match/remove", (req, res) => {
    const { me, partner } = req.body;
    data.matches = data.matches.filter(m => 
        !(m.p1 === me && m.p2 === partner) && 
        !(m.p1 === partner && m.p2 === me)
    );
    res.sendStatus(200);
});


app.listen(8080, () => console.log("校搭联机服务器启动：http://localhost:8080"));