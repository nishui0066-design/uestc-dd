// 1. 数据配置
const subData = {
    "运动": ["足球", "篮球", "羽毛球", "游泳"],
    "游戏": ["王者荣耀", "瓦罗兰特", "LOL"],
    "乐器": ["钢琴", "吉他", "古筝"]
};

// 模拟数据库
let currentUser = null; // 当前登录的你
let users = [
    { id: 101, name: "爱打球的学长", gender: "男", main: "运动", sub: "篮球", score: 65 },
    { id: 102, name: "瓦罗兰特女高", gender: "女", main: "游戏", sub: "瓦罗兰特", score: 85 },
    { id: 103, name: "钢琴十级选手", gender: "女", main: "乐器", sub: "钢琴", score: 40 }
];

let requests = []; // 收到的申请 [{fromId, toId}]
let matches = [];  // 已成的搭子 [{p1, p2}]

// 2. 初始化与级联
function updateSub() {
    const main = document.getElementById('mainCat').value;
    const sub = document.getElementById('subCat');
    sub.innerHTML = "";
    sub.disabled = false;
    subData[main].forEach(s => {
        let opt = document.createElement('option');
        opt.value = opt.text = s;
        sub.appendChild(opt);
    });
}

// 3. 注册（模拟登录）
function register() {
    const name = document.getElementById('username').value;
    if(!name) return alert("写个名字吧");
    
    currentUser = {
        id: Date.now(),
        name: name,
        gender: document.getElementById('gender').value,
        main: document.getElementById('mainCat').value,
        sub: document.getElementById('subCat').value,
        score: 50 // 初始分
    };
    
    alert("注册成功！你已进入校园广场。");
    renderSquare('全部');
}

// 4. 渲染广场
function renderSquare(filterType) {
    const grid = document.getElementById('square');
    grid.innerHTML = "";
    
    let list = users;
    if(filterType !== '全部') list = users.filter(u => u.main === filterType);

    list.forEach(u => {
        if(currentUser && u.id === currentUser.id) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <span class="score-badge">${u.score}分</span>
            <h4>${u.name} <span class="tag-gender">${u.gender}</span></h4>
            <p style="font-size:12px; color:#666">${u.main} · ${u.sub}</p>
            <button class="btn-match" onclick="sendRequest(${u.id})">向TA发起邀约</button>
        `;
        grid.appendChild(card);
    });
}

// 5. V3.0 核心：互选逻辑
function sendRequest(targetId) {
    if(!currentUser) return alert("请先完善名片");
    alert("申请已发送，等待对方同意...");
    // 模拟对方秒回（实际开发中这里是等待对方在自己的界面点同意）
    setTimeout(() => {
        receiveRequest(targetId);
    }, 1000);
}

function receiveRequest(fromId) {
    const fromUser = users.find(u => u.id === fromId) || {id: fromId, name: "模拟用户"};
    const reqList = document.getElementById('incoming-requests');
    const item = document.createElement('div');
    item.className = 'req-item';
    item.innerHTML = `
        <span>来自 <b>${fromUser.name}</b> 的匹配请求</span>
        <button onclick="acceptMatch(${fromId}, this)" style="background:var(--success); color:white">同意</button>
    `;
    reqList.appendChild(item);
    document.getElementById('req-count').innerText = "1";
}

function acceptMatch(fromId, btn) {
    const fromUser = users.find(u => u.id === fromId);
    matches.push({ id: fromId, name: fromUser.name, score: fromUser.score });
    
    // 更新界面
    btn.parentElement.remove();
    document.getElementById('req-count').innerText = "0";
    renderMatches();
}

function renderMatches() {
    const list = document.getElementById('matched-list');
    list.innerHTML = "";
    matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'req-item';
        item.innerHTML = `
            <span>🤝 <b>${m.name}</b> (积分:${m.score})</span>
            <button onclick="openActivity('${m.name}', ${m.id})" class="btn-action">开始对局/活动</button>
        `;
        list.appendChild(item);
    });
}

// 6. V3.0 智能匹配算法
function smartMatch() {
    if(!currentUser) return alert("请先注册");
    // 逻辑：寻找分区相同且积分差距在±20以内的
    const recommendations = users.filter(u => 
        u.main === currentUser.main && 
        Math.abs(u.score - currentUser.score) <= 20
    );
    
    const grid = document.getElementById('square');
    grid.innerHTML = "<h4>✨ 为你推荐的同等实力选手：</h4>";
    if(recommendations.length === 0) grid.innerHTML += "<p>暂无匹配，去广场看看吧</p>";
    
    // 复用渲染逻辑
    recommendations.forEach(u => {
        // ... (同renderSquare里的卡片生成代码)
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<span class="score-badge">${u.score}分</span><h4>${u.name}</h4><button class="btn-match" onclick="sendRequest(${u.id})">发起邀约</button>`;
        grid.appendChild(card);
    });
}

// 7. 手动结算逻辑
let activePartnerId = null;
function openActivity(name, id) {
    activePartnerId = id;
    document.getElementById('partner-name').innerText = name;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal(isWin) {
    if(isWin) {
        currentUser.score += 10;
        alert("恭喜获胜！个人积分已更新为：" + currentUser.score);
    } else {
        alert("再接再厉！积分未变动。");
    }
    document.getElementById('modal').style.display = 'none';
}