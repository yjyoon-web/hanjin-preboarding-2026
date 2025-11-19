const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 업로드 폴더 생성
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정 - 이미지 업로드
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'image-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // 이미지 파일만 허용
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다 (JPG, PNG, GIF, WEBP)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 제한
        files: 5 // 최대 5개 파일
    }
});

// Database 연결
const db = new sqlite3.Database('./hanjin_preboarding.db', (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err);
    } else {
        console.log('데이터베이스 연결 성공');
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // 업로드된 이미지 제공

// Session 설정
app.use(session({
    secret: 'hanjin-preboarding-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24시간
        httpOnly: true
    }
}));

// 인증 미들웨어
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: '로그인이 필요합니다' });
    }
    next();
}

// 관리자 권한 미들웨어
function requireAdmin(req, res, next) {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }
    next();
}

// ==================== 인증 API ====================

// 회원가입
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name, email } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요' });
        }

        // 중복 확인
        db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 오류' });
            }
            if (row) {
                return res.status(400).json({ error: '이미 존재하는 아이디입니다' });
            }

            // 비밀번호 해싱
            const hashedPassword = await bcrypt.hash(password, 10);

            // 사용자 생성
            db.run(
                'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
                [username, hashedPassword, name, email || null, 'user'],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: '회원가입 실패' });
                    }
                    res.json({ message: '회원가입이 완료되었습니다', userId: this.lastID });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});

// 로그인
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 오류' });
            }
            if (!user) {
                return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다' });
            }

            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.name = user.name;
            req.session.role = user.role;

            res.json({
                message: '로그인 성공',
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});

// 로그아웃
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: '로그아웃 실패' });
        }
        res.json({ message: '로그아웃 되었습니다' });
    });
});

// 현재 사용자 정보
app.get('/api/user', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '로그인되지 않음' });
    }
    res.json({
        id: req.session.userId,
        username: req.session.username,
        name: req.session.name,
        role: req.session.role
    });
});

// ==================== 공지사항 API ====================

// 공지사항 목록
app.get('/api/notices', (req, res) => {
    db.all(
        `SELECT n.*, u.name as author_name 
         FROM notices n 
         LEFT JOIN users u ON n.author_id = u.id 
         ORDER BY n.created_at DESC`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 오류' });
            }
            res.json(rows);
        }
    );
});

// 공지사항 상세
app.get('/api/notices/:id', (req, res) => {
    db.get(
        `SELECT n.*, u.name as author_name 
         FROM notices n 
         LEFT JOIN users u ON n.author_id = u.id 
         WHERE n.id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 오류' });
            }
            if (!row) {
                return res.status(404).json({ error: '공지사항을 찾을 수 없습니다' });
            }
            res.json(row);
        }
    );
});

// 공지사항 작성 (관리자만)
app.post('/api/notices', requireAdmin, (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 입력해주세요' });
    }

    db.run(
        'INSERT INTO notices (title, content, author_id) VALUES (?, ?, ?)',
        [title, content, req.session.userId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: '공지사항 작성 실패' });
            }
            res.json({ message: '공지사항이 작성되었습니다', id: this.lastID });
        }
    );
});

// 공지사항 수정 (관리자만)
app.put('/api/notices/:id', requireAdmin, (req, res) => {
    const { title, content } = req.body;

    db.run(
        'UPDATE notices SET title = ?, content = ? WHERE id = ?',
        [title, content, req.params.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: '공지사항 수정 실패' });
            }
            res.json({ message: '공지사항이 수정되었습니다' });
        }
    );
});

// 공지사항 삭제 (관리자만)
app.delete('/api/notices/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM notices WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            return res.status(500).json({ error: '공지사항 삭제 실패' });
        }
        res.json({ message: '공지사항이 삭제되었습니다' });
    });
});

// ==================== 방명록 API (이미지 업로드 포함) ====================

// 방명록 목록
app.get('/api/guestbook', (req, res) => {
    db.all(
        `SELECT g.*, u.name as author_name 
         FROM guestbook g 
         LEFT JOIN users u ON g.author_id = u.id 
         ORDER BY g.created_at DESC`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 오류' });
            }
            // images 필드를 JSON 파싱
            rows = rows.map(row => ({
                ...row,
                images: row.images ? JSON.parse(row.images) : []
            }));
            res.json(rows);
        }
    );
});

// 방명록 작성 (이미지 업로드)
app.post('/api/guestbook', requireAuth, upload.array('images', 5), (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: '내용을 입력해주세요' });
    }

    // 업로드된 이미지 파일 경로 배열
    const images = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];
    const imagesJson = JSON.stringify(images);

    db.run(
        'INSERT INTO guestbook (content, author_id, images) VALUES (?, ?, ?)',
        [content, req.session.userId, imagesJson],
        function (err) {
            if (err) {
                return res.status(500).json({ error: '방명록 작성 실패' });
            }
            res.json({ 
                message: '방명록이 작성되었습니다', 
                id: this.lastID,
                images: images
            });
        }
    );
});

// 방명록 삭제 (본인 또는 관리자)
app.delete('/api/guestbook/:id', requireAuth, (req, res) => {
    // 먼저 해당 게시글 조회
    db.get('SELECT * FROM guestbook WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 오류' });
        }
        if (!row) {
            return res.status(404).json({ error: '방명록을 찾을 수 없습니다' });
        }

        // 권한 확인 (본인 또는 관리자)
        if (row.author_id !== req.session.userId && req.session.role !== 'admin') {
            return res.status(403).json({ error: '삭제 권한이 없습니다' });
        }

        // 이미지 파일 삭제
        if (row.images) {
            try {
                const images = JSON.parse(row.images);
                images.forEach(imagePath => {
                    const fullPath = path.join(__dirname, 'public', imagePath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                });
            } catch (e) {
                console.error('이미지 파일 삭제 중 오류:', e);
            }
        }

        // 게시글 삭제
        db.run('DELETE FROM guestbook WHERE id = ?', [req.params.id], function (err) {
            if (err) {
                return res.status(500).json({ error: '방명록 삭제 실패' });
            }
            res.json({ message: '방명록이 삭제되었습니다' });
        });
    });
});

// ==================== 자기소개 API (이미지 업로드 포함) ====================

// 자기소개 목록
app.get('/api/introductions', (req, res) => {
    db.all(
        `SELECT i.*, u.name as author_name 
         FROM introductions i 
         LEFT JOIN users u ON i.author_id = u.id 
         ORDER BY i.created_at DESC`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 오류' });
            }
            // images 필드를 JSON 파싱
            rows = rows.map(row => ({
                ...row,
                images: row.images ? JSON.parse(row.images) : []
            }));
            res.json(rows);
        }
    );
});

// 자기소개 상세
app.get('/api/introductions/:id', (req, res) => {
    db.get(
        `SELECT i.*, u.name as author_name 
         FROM introductions i 
         LEFT JOIN users u ON i.author_id = u.id 
         WHERE i.id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 오류' });
            }
            if (!row) {
                return res.status(404).json({ error: '자기소개를 찾을 수 없습니다' });
            }
            // images 필드를 JSON 파싱
            row.images = row.images ? JSON.parse(row.images) : [];
            res.json(row);
        }
    );
});

// 자기소개 작성 (이미지 업로드)
app.post('/api/introductions', requireAuth, upload.array('images', 5), (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 입력해주세요' });
    }

    // 업로드된 이미지 파일 경로 배열
    const images = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];
    const imagesJson = JSON.stringify(images);

    db.run(
        'INSERT INTO introductions (title, content, author_id, images) VALUES (?, ?, ?, ?)',
        [title, content, req.session.userId, imagesJson],
        function (err) {
            if (err) {
                return res.status(500).json({ error: '자기소개 작성 실패' });
            }
            res.json({ 
                message: '자기소개가 작성되었습니다', 
                id: this.lastID,
                images: images
            });
        }
    );
});

// 자기소개 수정 (본인 또는 관리자) - 이미지 추가 업로드 지원
app.put('/api/introductions/:id', requireAuth, upload.array('images', 5), (req, res) => {
    const { title, content, keepImages } = req.body;

    // 먼저 해당 게시글 조회
    db.get('SELECT * FROM introductions WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 오류' });
        }
        if (!row) {
            return res.status(404).json({ error: '자기소개를 찾을 수 없습니다' });
        }

        // 권한 확인
        if (row.author_id !== req.session.userId && req.session.role !== 'admin') {
            return res.status(403).json({ error: '수정 권한이 없습니다' });
        }

        // 기존 이미지 처리
        let existingImages = [];
        if (keepImages) {
            try {
                existingImages = JSON.parse(keepImages);
            } catch (e) {
                existingImages = [];
            }
        }

        // 새로 업로드된 이미지
        const newImages = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];
        
        // 전체 이미지 배열 (기존 + 신규)
        const allImages = [...existingImages, ...newImages];
        const imagesJson = JSON.stringify(allImages);

        // 게시글 업데이트
        db.run(
            'UPDATE introductions SET title = ?, content = ?, images = ? WHERE id = ?',
            [title, content, imagesJson, req.params.id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: '자기소개 수정 실패' });
                }
                res.json({ 
                    message: '자기소개가 수정되었습니다',
                    images: allImages
                });
            }
        );
    });
});

// 자기소개 삭제 (본인 또는 관리자)
app.delete('/api/introductions/:id', requireAuth, (req, res) => {
    // 먼저 해당 게시글 조회
    db.get('SELECT * FROM introductions WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 오류' });
        }
        if (!row) {
            return res.status(404).json({ error: '자기소개를 찾을 수 없습니다' });
        }

        // 권한 확인
        if (row.author_id !== req.session.userId && req.session.role !== 'admin') {
            return res.status(403).json({ error: '삭제 권한이 없습니다' });
        }

        // 이미지 파일 삭제
        if (row.images) {
            try {
                const images = JSON.parse(row.images);
                images.forEach(imagePath => {
                    const fullPath = path.join(__dirname, 'public', imagePath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                });
            } catch (e) {
                console.error('이미지 파일 삭제 중 오류:', e);
            }
        }

        // 게시글 삭제
        db.run('DELETE FROM introductions WHERE id = ?', [req.params.id], function (err) {
            if (err) {
                return res.status(500).json({ error: '자기소개 삭제 실패' });
            }
            res.json({ message: '자기소개가 삭제되었습니다' });
        });
    });
});

// ==================== 이미지 개별 삭제 API ====================

// 게시글에서 특정 이미지만 삭제
app.delete('/api/:type/:id/image', requireAuth, (req, res) => {
    const { type, id } = req.params;
    const { imagePath } = req.body;

    if (!imagePath) {
        return res.status(400).json({ error: '이미지 경로가 필요합니다' });
    }

    const table = type === 'guestbook' ? 'guestbook' : 'introductions';

    // 게시글 조회
    db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 오류' });
        }
        if (!row) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
        }

        // 권한 확인
        if (row.author_id !== req.session.userId && req.session.role !== 'admin') {
            return res.status(403).json({ error: '삭제 권한이 없습니다' });
        }

        // 이미지 배열에서 해당 이미지 제거
        let images = row.images ? JSON.parse(row.images) : [];
        images = images.filter(img => img !== imagePath);
        const imagesJson = JSON.stringify(images);

        // 실제 파일 삭제
        const fullPath = path.join(__dirname, 'public', imagePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        // DB 업데이트
        db.run(
            `UPDATE ${table} SET images = ? WHERE id = ?`,
            [imagesJson, id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: '이미지 삭제 실패' });
                }
                res.json({ message: '이미지가 삭제되었습니다', images: images });
            }
        );
    });
});

// 서버 시작
// 서버 시작 시 데이터베이스 초기화
async function initializeDatabase() {
  try {
    console.log('데이터베이스 초기화 시작...');
    
    // 방명록 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guestbook (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        images TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 자기소개 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS introductions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        content TEXT NOT NULL,
        images TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 공지사항 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ 데이터베이스 테이블 생성 완료!');
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
  }
}

// 서버 시작
app.listen(PORT, async () => {
  console.log('==============================================');
  console.log('한진 2026 신입사원 프리보딩 홈페이지');
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다`);
  console.log('==============================================');
  
  // 데이터베이스 초기화 실행
  await initializeDatabase();
});
