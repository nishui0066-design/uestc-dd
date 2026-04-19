const fs = require('fs');

// 数据文件路径
const DATA_FILE = './data.json';

// 读取现有数据
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
        console.log('✅ 已加载历史数据');
    } catch(e) {
        console.log('加载数据失败，使用默认数据');
    }
}

// 生成随机用户数据
function generateRandomUsers(count) {
    const users = [];
    const sports = ['羽毛球', '乒乓球', '篮球', '足球', '网球', '排球', '游泳', '跑步'];
    const genders = ['男', '女'];
    const statuses = ['在线', '等待匹配', '忙碌'];
    
    for (let i = 1; i <= count; i++) {
        const id = i.toString();
        const user = {
            id: id,
            name: `用户${i}`,
            gender: genders[Math.floor(Math.random() * genders.length)],
            currentSport: sports[Math.floor(Math.random() * sports.length)],
            avatar: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=user%20avatar%20${i}&image_size=square`,
            signature: `这是用户${i}的个人签名`,
            currentStatus: statuses[Math.floor(Math.random() * statuses.length)],
            scores: {
                羽毛球: Math.floor(Math.random() * 1000),
                乒乓球: Math.floor(Math.random() * 1000),
                篮球: Math.floor(Math.random() * 1000),
                足球: Math.floor(Math.random() * 1000),
                网球: Math.floor(Math.random() * 1000)
            },
            t: Date.now() - Math.floor(Math.random() * 3600000) // 随机在线时间
        };
        users.push(user);
    }
    return users;
}

// 生成随机约局
function generateRandomParties(userIds, count) {
    const parties = [];
    const sports = ['羽毛球', '乒乓球', '篮球', '足球', '网球', '排球'];
    const locations = ['体育馆', '操场', '健身房', '篮球场', '羽毛球场', '乒乓球室'];
    
    for (let i = 1; i <= count; i++) {
        const creatorId = userIds[Math.floor(Math.random() * userIds.length)];
        const party = {
            id: i,
            creator: creatorId,
            creatorName: `用户${creatorId}`,
            title: `${sports[Math.floor(Math.random() * sports.length)]}约局`,
            sport: sports[Math.floor(Math.random() * sports.length)],
            location: locations[Math.floor(Math.random() * locations.length)],
            time: new Date(Date.now() + Math.random() * 7 * 24 * 3600000).toISOString(),
            maxPlayers: 4 + Math.floor(Math.random() * 7), // 4-10人
            players: [creatorId],
            invites: [],
            status: '进行中'
        };
        parties.push(party);
    }
    return parties;
}

// 生成随机群聊
function generateRandomGroups(userIds, count) {
    const groups = [];
    const sports = ['羽毛球', '乒乓球', '篮球', '足球', '网球', '排球', '综合'];
    
    for (let i = 1; i <= count; i++) {
        const creatorId = userIds[Math.floor(Math.random() * userIds.length)];
        const group = {
            id: Date.now() + i,
            groupName: `${sports[Math.floor(Math.random() * sports.length)]}群组${i}`,
            creatorId: creatorId,
            creatorName: `用户${creatorId}`,
            sport: sports[Math.floor(Math.random() * sports.length)],
            members: [{ id: creatorId, name: `用户${creatorId}` }],
            messages: [],
            createdAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 3600000) // 随机创建时间
        };
        groups.push(group);
    }
    return groups;
}

// 生成随机匹配
function generateRandomMatches(userIds, count) {
    const matches = [];
    const usedPairs = new Set();
    
    for (let i = 0; i < count; i++) {
        let p1, p2;
        do {
            p1 = userIds[Math.floor(Math.random() * userIds.length)];
            p2 = userIds[Math.floor(Math.random() * userIds.length)];
        } while (p1 === p2 || usedPairs.has(`${p1}-${p2}`) || usedPairs.has(`${p2}-${p1}`));
        
        usedPairs.add(`${p1}-${p2}`);
        matches.push({ p1, p2 });
    }
    return matches;
}

// 生成随机聊天记录
function generateRandomChats(userIds, count) {
    const chatRecords = {};
    const messages = [
        '你好！',
        '一起打球吗？',
        '什么时候有空？',
        '好的，没问题',
        '几点开始？',
        '在哪里集合？',
        '我已经到了',
        '稍等，我马上到',
        '今天天气不错',
        '最近怎么样？'
    ];
    
    for (let i = 0; i < count; i++) {
        const p1 = userIds[Math.floor(Math.random() * userIds.length)];
        const p2 = userIds[Math.floor(Math.random() * userIds.length)];
        if (p1 === p2) continue;
        
        const key = [p1, p2].sort().join('-');
        if (!chatRecords[key]) chatRecords[key] = [];
        
        const messageCount = 1 + Math.floor(Math.random() * 5);
        for (let j = 0; j < messageCount; j++) {
            chatRecords[key].push({
                from: [p1, p2][Math.floor(Math.random() * 2)],
                to: [p1, p2][Math.floor(Math.random() * 2)],
                text: messages[Math.floor(Math.random() * messages.length)],
                t: Date.now() - Math.floor(Math.random() * 7 * 24 * 3600000)
            });
        }
    }
    return chatRecords;
}

// 生成随机群聊消息
function generateRandomGroupMessages(groups, userIds, messagesPerGroup) {
    const groupMessages = {
        messages: []
    };
    
    const messages = [
        '大家好！',
        '有人一起打球吗？',
        '本周日活动安排',
        '新人报道',
        '最近有什么比赛？',
        '装备推荐',
        '训练计划分享',
        '加油！',
        '下周末见',
        '感谢组织'
    ];
    
    groups.forEach(group => {
        for (let i = 0; i < messagesPerGroup; i++) {
            const member = group.members[Math.floor(Math.random() * group.members.length)];
            group.messages.push({
                fromId: member.id,
                fromName: member.name,
                text: messages[Math.floor(Math.random() * messages.length)],
                time: Date.now() - Math.floor(Math.random() * 7 * 24 * 3600000)
            });
        }
    });
    
    return groups;
}

// 主函数
function generateData() {
    console.log('开始生成随机数据...');
    
    // 生成100个用户
    const users = generateRandomUsers(100);
    data.userProfiles = users;
    data.onlineUsers = users.filter(() => Math.random() > 0.3); // 70%在线
    
    const userIds = users.map(user => user.id);
    
    // 生成50个约局
    data.parties = generateRandomParties(userIds, 50);
    
    // 为约局添加随机成员
    data.parties.forEach(party => {
        const remainingSlots = party.maxPlayers - 1; // 减去创建者
        const availableUsers = userIds.filter(id => id !== party.creator);
        
        for (let i = 0; i < remainingSlots && i < availableUsers.length; i++) {
            if (Math.random() > 0.5) { // 50%概率加入
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                if (!party.players.includes(randomUser)) {
                    party.players.push(randomUser);
                }
            }
        }
        
        // 更新约局状态
        if (party.players.length >= party.maxPlayers) {
            party.status = '已结束';
        }
    });
    
    // 生成30个群聊
    data.groups = generateRandomGroups(userIds, 30);
    
    // 为群聊添加随机成员
    data.groups.forEach(group => {
        const memberCount = 3 + Math.floor(Math.random() * 12); // 3-15人
        
        for (let i = 1; i < memberCount; i++) {
            const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
            if (!group.members.some(m => m.id === randomUser)) {
                group.members.push({ id: randomUser, name: `用户${randomUser}` });
            }
        }
    });
    
    // 生成100个匹配
    data.matches = generateRandomMatches(userIds, 100);
    
    // 生成200条聊天记录
    data.chatRecords = generateRandomChats(userIds, 200);
    
    // 为群聊生成消息
    data.groups = generateRandomGroupMessages(data.groups, userIds, 10);
    
    // 保存数据
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('✅ 数据生成完成！');
    console.log(`生成了 ${data.userProfiles.length} 个用户`);
    console.log(`生成了 ${data.parties.length} 个约局`);
    console.log(`生成了 ${data.groups.length} 个群聊`);
    console.log(`生成了 ${data.matches.length} 个匹配`);
    console.log(`生成了 ${Object.keys(data.chatRecords).length} 条聊天记录`);
}

// 运行生成数据
if (require.main === module) {
    generateData();
}

module.exports = { generateData };