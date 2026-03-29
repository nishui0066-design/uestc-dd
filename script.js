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
let matches = [];  // 已成的搭子 [{p1, p2, isActivityCompleted, chatRecords}]
// 新增：聊天相关全局变量
let currentChatPartner = null; // 当前聊天的搭子ID

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
    
    // 新增：渲染个人信息
    renderUserInfo();
    alert("注册成功！你已进入校园广场。");
    renderSquare('全部');
}

// 新增：渲染个人信息界面
function renderUserInfo() {
    const panel = document.getElementById('user-info-panel');
    panel.style.display = "block"; // 显示个人信息面板
    document.getElementById('info-name').innerText = currentUser.name;
    document.getElementById('info-gender').innerText = currentUser.gender;
    document.getElementById('info-category').innerText = `${currentUser.main} · ${currentUser.sub}`;
    document.getElementById('info-score').innerText = currentUser.score;
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
    // 新增：添加活动完成标记、聊天记录
    matches.push({ 
        id: fromId, 
        name: fromUser.name, 
        score: fromUser.score,
        isActivityCompleted: false, // 是否完成过活动（防重复加分）
        chatRecords: [] // 聊天记录
    });
    
    // 更新界面
    btn.parentElement.remove();
    document.getElementById('req-count').innerText = "0";
    renderMatches();
}

// 6. 渲染已匹配搭子（新增聊天按钮、活动完成状态）
function renderMatches() {
    const list = document.getElementById('matched-list');
    list.innerHTML = "";
    matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'req-item';
        // 新增：活动按钮根据完成状态禁用，新增聊天按钮
        const activityBtn = m.isActivityCompleted 
            ? `<button class="btn-action" disabled>活动已完成</button>` 
            : `<button onclick="openActivity('${m.name}', ${m.id})" class="btn-action">开始对局/活动</button>`;
        
        item.innerHTML = `
            <span>🤝 <b>${m.name}</b> (积分:${m.score})</span>
            <div style="display: flex; gap: 5px;">
                ${activityBtn}
                <button onclick="openChatModal(${m.id})" class="btn-main" style="font-size:12px; padding:5px 8px">聊天</button>
            </div>
        `;
        list.appendChild(item);
    });
}

// 7. V3.0 智能匹配算法
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
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<span class="score-badge">${u.score}分</span><h4>${u.name} <span class="tag-gender">${u.gender}</span></h4><p style="font-size:12px; color:#666">${u.main} · ${u.sub}</p><button class="btn-match" onclick="sendRequest(${u.id})">发起邀约</button>`;
        grid.appendChild(card);
    });
}

// 8. 手动结算逻辑（新增：防重复加分）
let activePartnerId = null;
function openActivity(name, id) {
    // 检查是否已完成活动
    const matchItem = matches.find(m => m.id === id);
    if(matchItem.isActivityCompleted) {
        return alert("该搭子的活动已完成，无法再次加分哦～");
    }
    activePartnerId = id;
    document.getElementById('partner-name').innerText = name;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal(isWin) {
    if(activePartnerId && isWin) {
        // 找到对应搭子，标记活动完成
        const matchItem = matches.find(m => m.id === activePartnerId);
        if(matchItem && !matchItem.isActivityCompleted) {
            currentUser.score += 10;
            matchItem.isActivityCompleted = true; // 标记为已完成
            alert("恭喜获胜！个人积分已更新为：" + currentUser.score);
            // 刷新个人信息和搭子列表
            renderUserInfo();
            renderMatches();
        }
    } else if(isWin) {
        alert("再接再厉！积分未变动。");
    }
    document.getElementById('modal').style.display = 'none';
    activePartnerId = null;
}

// 新增：聊天功能
// 打开聊天弹窗
function openChatModal(partnerId) {
    const matchItem = matches.find(m => m.id === partnerId);
    if(!matchItem) return alert("未找到该搭子～");
    
    currentChatPartner = partnerId;
    document.getElementById('chat-partner-name').innerText = matchItem.name;
    // 渲染聊天记录
    renderChatHistory();
    // 显示聊天弹窗
    document.getElementById('chat-modal').style.display = 'flex';
}

// 关闭聊天弹窗
function closeChatModal() {
    document.getElementById('chat-modal').style.display = 'none';
    currentChatPartner = null;
}

// 渲染聊天记录
function renderChatHistory() {
    const matchItem = matches.find(m => m.id === currentChatPartner);
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML = "";
    
    if(matchItem.chatRecords.length === 0) {
        chatHistory.innerHTML = "<p style='color:#94a3b8; text-align:center;'>暂无聊天记录，开始聊聊吧～</p>";
        return;
    }
    
    // 遍历聊天记录渲染
    matchItem.chatRecords.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${msg.sender === 'me' ? 'me' : 'other'}`;
        msgDiv.innerText = msg.content;
        chatHistory.appendChild(msgDiv);
    });
    // 滚动到底部
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// 发送聊天消息
function sendChatMsg() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if(!content || !currentChatPartner) return;
    
    const matchItem = matches.find(m => m.id === currentChatPartner);
    // 添加自己的消息
    matchItem.chatRecords.push({ sender: 'me', content: content });
    // 模拟对方回复（新手演示用，实际需后端交互）
    setTimeout(() => {
        const replys = ["你好呀～", "哈哈好的！", "下次一起玩～", "收到收到😜"];
        const randomReply = replys[Math.floor(Math.random() * replys.length)];
        matchItem.chatRecords.push({ sender: 'other', content: randomReply });
        renderChatHistory();
    }, 800);
    
    // 清空输入框，重新渲染记录
    input.value = "";
    renderChatHistory();
}