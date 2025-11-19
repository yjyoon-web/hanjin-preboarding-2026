// ==================== 전역 변수 ====================
let currentUser = null;
let selectedImages = [];
let existingImages = [];
let currentEditingId = null;

// ==================== 페이지 로드 시 초기화 ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadNotices();
});

// ==================== 이벤트 리스너 설정 ====================
function setupEventListeners() {
    // 네비게이션 버튼
    document.getElementById('loginBtn')?.addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn')?.addEventListener('click', () => openModal('registerModal'));

    // 폼 제출
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('noticeForm')?.addEventListener('submit', handleNoticeSubmit);
    document.getElementById('guestbookForm')?.addEventListener('submit', handleGuestbookSubmit);
    document.getElementById('introductionForm')?.addEventListener('submit', handleIntroductionSubmit);

    // 작성 버튼
    document.getElementById('writeNoticeBtn')?.addEventListener('click', openNoticeForm);
    document.getElementById('writeGuestbookBtn')?.addEventListener('click', openGuestbookForm);
    document.getElementById('writeIntroductionBtn')?.addEventListener('click', openIntroductionForm);

    // 파일 입력 이벤트
    document.getElementById('guestbookImages')?.addEventListener('change', (e) => handleFileSelect(e, 'guestbook'));
    document.getElementById('introductionImages')?.addEventListener('change', (e) => handleFileSelect(e, 'introduction'));

    // 모달 외부 클릭 시 닫기
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// ==================== 인증 관련 ====================
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            currentUser = await response.json();
            updateUIForLoggedInUser();
        } else {
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('인증 확인 오류:', error);
        currentUser = null;
        updateUIForLoggedOutUser();
    }
}

function updateUIForLoggedInUser() {
    const navUser = document.getElementById('navUser');
    navUser.innerHTML = `
        <span style="color: white; margin-right: 1rem;">
            <i class="fas fa-user"></i> ${currentUser.name}님
        </span>
        <button class="btn btn-secondary" onclick="handleLogout()">
            <i class="fas fa-sign-out-alt"></i> 로그아웃
        </button>
    `;

    // 작성 버튼 표시
    document.getElementById('writeGuestbookBtn').style.display = 'inline-flex';
    document.getElementById('writeIntroductionBtn').style.display = 'inline-flex';

    // 관리자만 공지사항 작성 버튼 표시
    if (currentUser.role === 'admin') {
        document.getElementById('writeNoticeBtn').style.display = 'inline-flex';
    }
}

function updateUIForLoggedOutUser() {
    const navUser = document.getElementById('navUser');
    navUser.innerHTML = `
        <button class="btn btn-primary" id="loginBtn">로그인</button>
        <button class="btn btn-secondary" id="registerBtn">회원가입</button>
    `;

    // 이벤트 리스너 재설정
    document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));

    // 작성 버튼 숨기기
    document.getElementById('writeNoticeBtn').style.display = 'none';
    document.getElementById('writeGuestbookBtn').style.display = 'none';
    document.getElementById('writeIntroductionBtn').style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert('로그인 성공!');
            closeModal('loginModal');
            e.target.reset();
            await checkAuth();
            loadAllData();
        } else {
            alert(result.error || '로그인 실패');
        }
    } catch (error) {
        alert('로그인 중 오류가 발생했습니다');
        console.error(error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
        name: formData.get('name'),
        email: formData.get('email')
    };

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert('회원가입이 완료되었습니다! 로그인해주세요.');
            closeModal('registerModal');
            e.target.reset();
            openModal('loginModal');
        } else {
            alert(result.error || '회원가입 실패');
        }
    } catch (error) {
        alert('회원가입 중 오류가 발생했습니다');
        console.error(error);
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        alert('로그아웃 되었습니다');
        currentUser = null;
        updateUIForLoggedOutUser();
        showSection('homeSection');
        loadAllData();
    } catch (error) {
        alert('로그아웃 중 오류가 발생했습니다');
        console.error(error);
    }
}

// ==================== 모달 관련 ====================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    // 폼 초기화
    const modal = document.getElementById(modalId);
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
    // 이미지 미리보기 초기화
    selectedImages = [];
    existingImages = [];
    currentEditingId = null;
    document.querySelectorAll('.image-preview-grid').forEach(el => el.innerHTML = '');
}

// ==================== 섹션 전환 ====================
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    // 데이터 로드
    if (sectionId === 'noticesSection') loadNotices();
    else if (sectionId === 'guestbookSection') loadGuestbook();
    else if (sectionId === 'introductionsSection') loadIntroductions();
}

function loadAllData() {
    loadNotices();
    loadGuestbook();
    loadIntroductions();
}

// ==================== 파일 선택 및 미리보기 ====================
function handleFileSelect(event, type) {
    const files = Array.from(event.target.files);
    const previewId = type === 'guestbook' ? 'guestbookPreview' : 'introductionPreview';
    const previewContainer = document.getElementById(previewId);

    // 최대 5개 파일 제한
    if (selectedImages.length + files.length > 5) {
        alert('최대 5장까지 업로드 가능합니다');
        return;
    }

    files.forEach(file => {
        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name}은(는) 5MB를 초과합니다`);
            return;
        }

        // 이미지 파일인지 확인
        if (!file.type.startsWith('image/')) {
            alert(`${file.name}은(는) 이미지 파일이 아닙니다`);
            return;
        }

        selectedImages.push(file);

        // 미리보기 생성
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="미리보기">
                <button type="button" class="image-preview-remove" onclick="removePreviewImage(${selectedImages.length - 1}, '${type}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
    });

    // input 초기화 (같은 파일 재선택 가능하도록)
    event.target.value = '';
}

function removePreviewImage(index, type) {
    selectedImages.splice(index, 1);
    const previewId = type === 'guestbook' ? 'guestbookPreview' : 'introductionPreview';
    renderImagePreviews(previewId, type);
}

function renderImagePreviews(containerId, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="미리보기">
                <button type="button" class="image-preview-remove" onclick="removePreviewImage(${index}, '${type}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function removeExistingImage(imagePath, index) {
    existingImages.splice(index, 1);
    renderExistingImages();
}

function renderExistingImages() {
    const container = document.getElementById('introductionExistingImages');
    container.innerHTML = '';

    existingImages.forEach((imagePath, index) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
            <img src="${imagePath}" alt="기존 이미지">
            <button type="button" class="image-preview-remove" onclick="removeExistingImage('${imagePath}', ${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

// ==================== 공지사항 ====================
async function loadNotices() {
    try {
        const response = await fetch('/api/notices');
        const notices = await response.json();
        const container = document.getElementById('noticesList');

        if (notices.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">등록된 공지사항이 없습니다</p>';
            return;
        }

        container.innerHTML = notices.map(notice => `
            <div class="post-item" onclick="showNoticeDetail(${notice.id})">
                <div class="post-header">
                    <div class="post-title">${escapeHtml(notice.title)}</div>
                </div>
                <div class="post-meta">
                    <span><i class="fas fa-user"></i> ${escapeHtml(notice.author_name || '관리자')}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(notice.created_at)}</span>
                </div>
                <div class="post-excerpt">${escapeHtml(truncateText(notice.content, 100))}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('공지사항 로드 오류:', error);
    }
}

async function showNoticeDetail(id) {
    try {
        const response = await fetch(`/api/notices/${id}`);
        const notice = await response.json();

        document.getElementById('noticeDetailTitle').textContent = notice.title;
        document.getElementById('noticeDetailAuthor').textContent = notice.author_name || '관리자';
        document.getElementById('noticeDetailDate').textContent = formatDate(notice.created_at);
        document.getElementById('noticeDetailContent').textContent = notice.content;

        // 수정/삭제 버튼 (관리자만)
        const actionsContainer = document.getElementById('noticeDetailActions');
        if (currentUser && currentUser.role === 'admin') {
            actionsContainer.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="editNotice(${notice.id})">
                    <i class="fas fa-edit"></i> 수정
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteNotice(${notice.id})">
                    <i class="fas fa-trash"></i> 삭제
                </button>
            `;
        } else {
            actionsContainer.innerHTML = '';
        }

        openModal('noticeDetailModal');
    } catch (error) {
        console.error('공지사항 상세 로드 오류:', error);
    }
}

function openNoticeForm() {
    document.getElementById('noticeModalTitle').innerHTML = '<i class="fas fa-pen"></i> 공지사항 작성';
    document.getElementById('noticeForm').reset();
    document.querySelector('[name="noticeId"]').value = '';
    openModal('noticeModal');
}

async function editNotice(id) {
    try {
        const response = await fetch(`/api/notices/${id}`);
        const notice = await response.json();

        document.getElementById('noticeModalTitle').innerHTML = '<i class="fas fa-edit"></i> 공지사항 수정';
        document.querySelector('[name="noticeId"]').value = id;
        document.querySelector('[name="title"]').value = notice.title;
        document.querySelector('[name="content"]').value = notice.content;

        closeModal('noticeDetailModal');
        openModal('noticeModal');
    } catch (error) {
        console.error('공지사항 수정 오류:', error);
    }
}

async function handleNoticeSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const noticeId = formData.get('noticeId');
    const data = {
        title: formData.get('title'),
        content: formData.get('content')
    };

    try {
        const url = noticeId ? `/api/notices/${noticeId}` : '/api/notices';
        const method = noticeId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert(noticeId ? '공지사항이 수정되었습니다' : '공지사항이 작성되었습니다');
            closeModal('noticeModal');
            loadNotices();
        } else {
            alert(result.error || '작업 실패');
        }
    } catch (error) {
        alert('오류가 발생했습니다');
        console.error(error);
    }
}

async function deleteNotice(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (response.ok) {
            alert('공지사항이 삭제되었습니다');
            closeModal('noticeDetailModal');
            loadNotices();
        } else {
            alert(result.error || '삭제 실패');
        }
    } catch (error) {
        alert('오류가 발생했습니다');
        console.error(error);
    }
}

// ==================== 방명록 ====================
async function loadGuestbook() {
    try {
        const response = await fetch('/api/guestbook');
        const guestbook = await response.json();
        const container = document.getElementById('guestbookList');

        if (guestbook.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">등록된 방명록이 없습니다</p>';
            return;
        }

        container.innerHTML = guestbook.map(entry => `
            <div class="post-item">
                <div class="post-meta">
                    <span><i class="fas fa-user"></i> ${escapeHtml(entry.author_name || '익명')}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(entry.created_at)}</span>
                </div>
                <div class="post-excerpt">${escapeHtml(entry.content)}</div>
                ${entry.images && entry.images.length > 0 ? `
                    <div class="post-images-preview">
                        ${entry.images.map(img => `<img src="${img}" alt="첨부 이미지" onclick="openLightbox('${img}')">`).join('')}
                    </div>
                ` : ''}
                ${canDeletePost(entry) ? `
                    <div class="post-actions">
                        <button class="btn btn-danger btn-sm" onclick="deleteGuestbook(${entry.id})">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('방명록 로드 오류:', error);
    }
}

function openGuestbookForm() {
    selectedImages = [];
    document.getElementById('guestbookForm').reset();
    document.getElementById('guestbookPreview').innerHTML = '';
    openModal('guestbookModal');
}

async function handleGuestbookSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    // 파일 추가
    selectedImages.forEach(file => {
        formData.append('images', file);
    });

    try {
        const response = await fetch('/api/guestbook', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert('방명록이 작성되었습니다');
            closeModal('guestbookModal');
            selectedImages = [];
            loadGuestbook();
        } else {
            alert(result.error || '작성 실패');
        }
    } catch (error) {
        alert('오류가 발생했습니다');
        console.error(error);
    }
}

async function deleteGuestbook(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`/api/guestbook/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (response.ok) {
            alert('방명록이 삭제되었습니다');
            loadGuestbook();
        } else {
            alert(result.error || '삭제 실패');
        }
    } catch (error) {
        alert('오류가 발생했습니다');
        console.error(error);
    }
}

// ==================== 자기소개 ====================
async function loadIntroductions() {
    try {
        const response = await fetch('/api/introductions');
        const introductions = await response.json();
        const container = document.getElementById('introductionsList');

        if (introductions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">등록된 자기소개가 없습니다</p>';
            return;
        }

        container.innerHTML = introductions.map(intro => `
            <div class="post-item" onclick="showIntroductionDetail(${intro.id})">
                <div class="post-header">
                    <div class="post-title">${escapeHtml(intro.title)}</div>
                </div>
                <div class="post-meta">
                    <span><i class="fas fa-user"></i> ${escapeHtml(intro.author_name || '익명')}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(intro.created_at)}</span>
                </div>
                <div class="post-excerpt">${escapeHtml(truncateText(intro.content, 100))}</div>
                ${intro.images && intro.images.length > 0 ? `
                    <div class="post-images-preview">
                        ${intro.images.slice(0, 3).map(img => `<img src="${img}" alt="첨부 이미지">`).join('')}
                        ${intro.images.length > 3 ? `<span style="color: #999;">+${intro.images.length - 3}장 더보기</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('자기소개 로드 오류:', error);
    }
}

async function showIntroductionDetail(id) {
    try {
        const response = await fetch(`/api/introductions/${id}`);
        const intro = await response.json();

        document.getElementById('introductionDetailTitle').textContent = intro.title;
        document.getElementById('introductionDetailAuthor').textContent = intro.author_name || '익명';
        document.getElementById('introductionDetailDate').textContent = formatDate(intro.created_at);
        document.getElementById('introductionDetailContent').textContent = intro.content;

        // 이미지 갤러리
        const imagesContainer = document.getElementById('introductionDetailImages');
        if (intro.images && intro.images.length > 0) {
            imagesContainer.innerHTML = intro.images.map(img => `
                <div class="detail-image-item" onclick="openLightbox('${img}')">
                    <img src="${img}" alt="첨부 이미지">
                </div>
            `).join('');
        } else {
            imagesContainer.innerHTML = '';
        }

        // 수정/삭제 버튼
        const actionsContainer = document.getElementById('introductionDetailActions');
        if (canDeletePost(intro)) {
            actionsContainer.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="editIntroduction(${intro.id})">
                    <i class="fas fa-edit"></i> 수정
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteIntroduction(${intro.id})">
                    <i class="fas fa-trash"></i> 삭제
                </button>
            `;
        } else {
            actionsContainer.innerHTML = '';
        }

        openModal('introductionDetailModal');
    } catch (error) {
        console.error('자기소개 상세 로드 오류:', error);
    }
}

function openIntroductionForm() {
    selectedImages = [];
    existingImages = [];
    currentEditingId = null;
    document.getElementById('introductionModalTitle').innerHTML = '<i class="fas fa-pen"></i> 자기소개 작성';
    document.getElementById('introductionForm').reset();
    document.querySelector('[name="introductionId"]').value = '';
    document.getElementById('introductionPreview').innerHTML = '';
    document.getElementById('introductionExistingImages').innerHTML = '';
    openModal('introductionModal');
}

async function editIntroduction(id) {
    try {
        const response = await fetch(`/api/introductions/${id}`);
        const intro = await response.json();

        currentEditingId = id;
        existingImages = intro.images || [];
        selectedImages = [];

        document.getElementById('introductionModalTitle').innerHTML = '<i class="fas fa-edit"></i> 자기소개 수정';
        document.querySelector('[name="introductionId"]').value = id;
        document.querySelector('[name="title"]').value = intro.title;
        document.querySelector('[name="content"]').value = intro.content;

        // 기존 이미지 표시
        renderExistingImages();

        document.getElementById('introductionPreview').innerHTML = '';

        closeModal('introductionDetailModal');
        openModal('introductionModal');
    } catch (error) {
        console.error('자기소개 수정 오류:', error);
    }
}

async function handleIntroductionSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const introductionId = formData.get('introductionId');

    // 수정 시 기존 이미지 정보 추가
    if (introductionId && existingImages.length > 0) {
        formData.append('keepImages', JSON.stringify(existingImages));
    }

    // 새 이미지 파일 추가
    selectedImages.forEach(file => {
        formData.append('images', file);
    });

    try {
        const url = introductionId ? `/api/introductions/${introductionId}` : '/api/introductions';
        const method = introductionId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert(introductionId ? '자기소개가 수정되었습니다' : '자기소개가 작성되었습니다');
            closeModal('introductionModal');
            selectedImages = [];
            existingImages = [];
            currentEditingId = null;
            loadIntroductions();
        } else {
            alert(result.error || '작업 실패');
        }
    } catch (error) {
        alert('오류가 발생했습니다');
        console.error(error);
    }
}

async function deleteIntroduction(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`/api/introductions/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (response.ok) {
            alert('자기소개가 삭제되었습니다');
            closeModal('introductionDetailModal');
            loadIntroductions();
        } else {
            alert(result.error || '삭제 실패');
        }
    } catch (error) {
        alert('오류가 발생했습니다');
        console.error(error);
    }
}

// ==================== 이미지 라이트박스 ====================
function openLightbox(imageSrc) {
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    lightboxImage.src = imageSrc;
    lightbox.classList.add('active');
}

function closeLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    lightbox.classList.remove('active');
}

// ==================== 유틸리티 함수 ====================
function canDeletePost(post) {
    if (!currentUser) return false;
    return currentUser.id === post.author_id || currentUser.role === 'admin';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
