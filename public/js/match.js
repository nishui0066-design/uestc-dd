// match.js - 搭线页面专用

let currentUser = null;

// 页面加载
window.onload = () => {
    const saved = localStorage.getItem("user");
    if (saved) {
        currentUser = JSON.parse(saved);
        loadMatchProfile();
        loadOtherUsers();
    }
};

function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toastMsg');
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', duration);
}

function saveMatchProfile() {
    if (!currentUser) {
        showToast('用户信息未加载，请稍后重试', 2000);
        return;
    }
    
    const age = document.getElementById('match-age').value;
    const height = document.getElementById('match-height').value;
    const gender = document.getElementById('match-gender').value;
    const personality = document.getElementById('match-personality').value;
    const desc = document.getElementById('match-desc').value;
    
    if (!age || !height || !gender || !personality || !desc) {
        showToast('请填写完整的个人信息', 2000);
        return;
    }
    
    // 保存个人信息到用户对象
    currentUser.matchProfile = {
        age: parseInt(age),
        height: parseInt(height),
        gender: gender,
        personality: personality,
        description: desc
    };
    
    // 保存到本地存储
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    // 发送到服务器
    fetch('/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentUser)
    }).then(() => {
        showToast('个人信息保存成功 ✅', 1500);
        loadOtherUsers();
    }).catch(err => {
        console.error('保存失败:', err);
        showToast('网络错误，保存失败', 2000);
    });
}

function loadMatchProfile() {
    if (currentUser && currentUser.matchProfile) {
        const profile = currentUser.matchProfile;
        document.getElementById('match-age').value = profile.age || '';
        document.getElementById('match-height').value = profile.height || '';
        document.getElementById('match-gender').value = profile.gender || '';
        document.getElementById('match-personality').value = profile.personality || '';
        document.getElementById('match-desc').value = profile.description || '';
    }
}

function loadOtherUsers() {
    fetch('/data')
        .then(r => r.json())
        .then(data => {
            const users = data.userProfiles || [];
            const otherUsers = users.filter(u => 
                u.id !== currentUser.id && u.matchProfile
            );
            renderOtherUsers(otherUsers);
        })
        .catch(err => {
            console.error('加载用户列表失败:', err);
            showToast('网络错误，加载失败', 2000);
        });
}

function renderOtherUsers(users) {
    const grid = document.getElementById('users-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    if (users.length === 0) {
        grid.innerHTML = '<div class="empty-tip">暂无其他用户，请先完善自己的个人信息</div>';
        return;
    }
    
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';
        const profile = user.matchProfile;
        
        card.innerHTML = `
            <h3>${user.name} (${profile.gender})</h3>
            <div class="info-item">
                <span class="info-label">年龄：</span>
                <span class="info-value">${profile.age}岁</span>
            </div>
            <div class="info-item">
                <span class="info-label">身高：</span>
                <span class="info-value">${profile.height}cm</span>
            </div>
            <div class="info-item">
                <span class="info-label">性格：</span>
                <span class="info-value">${profile.personality}</span>
            </div>
            <div class="self-desc">
                <strong>自我叙述：</strong>${profile.description}
            </div>
            <button onclick="startChat('${user.id}', '${user.name}')">💬 开始聊天</button>
        `;
        
        grid.appendChild(card);
    });
}

function startChat(userId, userName) {
    if (!currentUser || !currentUser.matchProfile) {
        showToast('请先完善个人信息', 2000);
        return;
    }
    
    // 跳转到聊天页面
    window.location.href = `/chat.html?userId=${currentUser.id}&chatWith=${userId}&chatWithName=${encodeURIComponent(userName)}`;
}