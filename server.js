const express = require("express");
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let data = {
    onlineUsers: [],
    invites: [],
    matches: [],
    chatRecords: {}
};

// 清理超时用户
setInterval(() => {
    const now = Date.now();
    data.onlineUsers = data.onlineUsers.filter(u => now - u.t < 10000);
}, 2000);

app.get("/", (req, res) => res.sendFile("index.html", { root: __dirname }));
app.get("/data", (req, res) => res.json(data));

app.post("/online", (req, res) => {
    const u = req.body;
    u.t = Date.now();
    const idx = data.onlineUsers.findIndex(x => x.id === u.id);
    if (idx >= 0) data.onlineUsers[idx] = u;
    else data.onlineUsers.push(u);
    res.sendStatus(200);
});

app.post("/invite", (req, res) => {
    data.invites.push(req.body);
    res.sendStatus(200);
});

app.post("/invite/clear", (req, res) => {
    data.invites = data.invites.filter(i => i.to !== req.body.to);
    res.sendStatus(200);
});

app.post("/match", (req, res) => {
    data.matches.push(req.body);
    res.sendStatus(200);
});

app.post("/chat", (req, res) => {
    const {from,to,text} = req.body;
    const key = [from,to].sort().join("-");
    if (!data.chatRecords[key]) data.chatRecords[key] = [];
    data.chatRecords[key].push({from,to,text,t:Date.now()});
    res.sendStatus(200);
});

app.listen(8080, () => console.log("校搭联机服务器启动：http://localhost:8080"));