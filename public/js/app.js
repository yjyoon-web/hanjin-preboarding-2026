// 섹션 전환
function showSection(sectionId) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 모든 네비게이션 버튼 비활성화
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 선택된 섹션 보이기
    document.getElementById(sectionId).classList.add('active');
    
    // 선택된 버튼 활성화
    event.target.classList.add('active');
    
    // 데이터 로드
    if (sectionId === 'guestbook') {
        loadGuestbook();
    } else if (sectionId === 'introductions') {
        loadIntroductions();
    } else if (sectionId === 'notices') {
        loadNotices();
    }
}

// 이미지 미리보기
function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    input.addEventListener('change', function(e) {
        preview.innerHTML = '';
        const files = Array.from(e.target.files).slice(0, 5);
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
}

// 방명록 제출
async function submitGuestbook() {
    const name = document.getElementById('guestbook-name').value.trim();
    const message = document.getElementById('guestbook-message').value.trim();
    const images = document.getElementById('guestbook-images').files;
    
    if (!name || !message) {
        alert('이름과 메시지를 입력해주세요.');
        return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('message', message);
    
    for (let i = 0; i < Math.min(images.length, 5); i++) {
        formData.append('images', images[i]);
    }
    
    try {
        const response = await fetch('/api/guestbook', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            alert('방명록이 작성되었습니다!');
            document.getElementById('guestbook-name').value = '';
            document.getElementById('guestbook-message').value = '';
            document.getElementById('guestbook-images').value = '';
            document.getElementById('guestbook-preview').innerHTML = '';
            loadGuestbook();
        } else {
            alert('작성에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('오류가 발생했습니다.');
    }
}

// 자기소개 제출
async function submitIntroduction() {
    const name = document.getElementById('intro-name').value.trim();
    const department = document.getElementById('intro-department').value.trim();
    const content = document.getElementById('intro-content').value.trim();
    const images = document.getElementById('intro-images').files;
    
    if (!name || !content) {
        alert('이름과 내용을 입력해주세요.');
        return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('department', department);
    formData.append('content', content);
    
    for (let i = 0; i < Math.min(images.length, 5); i++) {
        formData.append('images', images[i]);
    }
    
    try {
        const response = await fetch('/api/introductions', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            alert('자기소개가 작성되었습니다!');
            document.getElementById('intro-name').value = '';
            document.getElementById('intro-department').value = '';
            document.getElementById('intro-content').value = '';
            document.getElementById('intro-images').value = '';
            document.getElementById('intro-preview').innerHTML = '';
            loadIntroductions();
        } else {
            alert('작성에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('오류가 발생했습니다.');
    }
}

// 공지사항 제출
async function submitNotice() {
    const title = document.getElementById('notice-title').value.trim();
    const content = document.getElementById('notice-content').value.trim();
    const author = document.getElementById('notice-author').value.trim();
    
    if (!title || !content || !author) {
        alert('모든 항목을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch('/api/notices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, content, author })
        });
        
        if (response.ok) {
            alert('공지사항이 작성되었습니다!');
            document.getElementById('notice-title').value = '';
            document.getElementById('notice-content').value = '';
            document.getElementById('notice-author').value = '';
            loadNotices();
        } else {
            alert('작성에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('오류가 발생했습니다.');
    }
}

// 방명록 로드
async function loadGuestbook() {
    try {
        const response = await fetch('/api/guestbook');
        const posts = await response.json();
        
        const list = document.getElementById('guestbook-list');
        list.innerHTML = '';
        
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            
            const initial = post.name.charAt(0).toUpperCase();
            const date = new Date(post.created_at).toLocaleDateString('ko-KR');
            
            let imagesHTML = '';
            if (post.images && post.images.length > 0) {
                imagesHTML = `
                    <div class="post-images">
                        ${post.images.map(img => `<img src="${img}" alt="사진">`).join('')}
                    </div>
                `;
            }
            
            card.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar">${initial}</div>
                    <div class="post-info">
                        <h4>${post.name}</h4>
                        <span>${date}</span>
                    </div>
                </div>
                <div class="post-content">${post.message}</div>
                ${imagesHTML}
                <div class="post-actions">
                    <button class="btn-delete" onclick="deleteGuestbook(${post.id})">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            `;
            
            list.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// 자기소개 로드
async function loadIntroductions() {
    try {
        const response = await fetch('/api/introductions');
        const posts = await response.json();
        
        const list = document.getElementById('introductions-list');
        list.innerHTML = '';
        
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            
            const initial = post.name.charAt(0).toUpperCase();
            const date = new Date(post.created_at).toLocaleDateString('ko-KR');
            
            let imagesHTML = '';
            if (post.images && post.images.length > 0) {
                imagesHTML = `
                    <div class="post-images">
                        ${post.images.map(img => `<img src="${img}" alt="사진">`).join('')}
                    </div>
                `;
            }
            
            card.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar">${initial}</div>
                    <div class="post-info">
                        <h4>${post.name} ${post.department ? `(${post.department})` : ''}</h4>
                        <span>${date}</span>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${imagesHTML}
                <div class="post-actions">
                    <button class="btn-delete" onclick="deleteIntroduction(${post.id})">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            `;
            
            list.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// 공지사항 로드
async function loadNotices() {
    try {
        const response = await fetch('/api/notices');
        const notices = await response.json();
        
        const list = document.getElementById('notices-list');
        list.innerHTML = '';
        
        notices.forEach(notice => {
            const card = document.createElement('div');
            card.className = 'notice-card';
            
            const date = new Date(notice.created_at).toLocaleDateString('ko-KR');
            
            card.innerHTML = `
                <div class="notice-header">
                    <h3><i class="fas fa-bullhorn"></i> ${notice.title}</h3>
                </div>
                <div class="notice-meta">
                    <span><i class="fas fa-user"></i> ${notice.author}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                </div>
                <div class="notice-content">${notice.content}</div>
                <div class="post-actions">
                    <button class="btn-delete" onclick="deleteNotice(${notice.id})">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            `;
            
            list.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// 삭제 함수들
async function deleteGuestbook(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/api/guestbook/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadGuestbook();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteIntroduction(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/api/introductions/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadIntroductions();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteNotice(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadNotices();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 이미지 미리보기 설정
    setupImagePreview('guestbook-images', 'guestbook-preview');
    setupImagePreview('intro-images', 'intro-preview');
    
    // 초기 데이터 로드
    loadGuestbook();
});
