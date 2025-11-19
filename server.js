const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 데이터베이스 연결 테스트
pool.connect((err, client, release) => {
  if (err) {
    console.error('데이터베이스 연결 실패:', err);
  } else {
    console.log('데이터베이스 연결 성공');
    release();
  }
});

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET || 'hanjin2026preboarding-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));

// Multer 설정 (메모리 저장)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // 최대 5개 파일
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('이미지 파일만 업로드 가능합니다 (JPEG, JPG, PNG, GIF, WEBP)'));
  }
});

// Cloudinary 업로드 함수
async function uploadToCloudinary(fileBuffer, originalName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'hanjin-preboarding',
        resource_type: 'auto',
        public_id: `${Date.now()}-${originalName.split('.')[0]}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// ==================== 방명록 API ====================

// 방명록 목록 조회
app.get('/api/guestbook', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM guestbook ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('방명록 조회 오류:', error);
    res.status(500).json({ error: '방명록을 불러오는데 실패했습니다.' });
  }
});

// 방명록 작성
app.post('/api/guestbook', upload.array('images', 5), async (req, res) => {
  try {
    const { name, message } = req.body;
    
    if (!name || !message) {
      return res.status(400).json({ error: '이름과 메시지를 입력해주세요.' });
    }

    // 이미지 업로드
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file.buffer, file.originalname)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    const result = await pool.query(
      'INSERT INTO guestbook (name, message, images) VALUES ($1, $2, $3) RETURNING *',
      [name, message, imageUrls]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('방명록 작성 오류:', error);
    res.status(500).json({ error: '방명록 작성에 실패했습니다.' });
  }
});

// 방명록 삭제
app.delete('/api/guestbook/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM guestbook WHERE id = $1', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    console.error('방명록 삭제 오류:', error);
    res.status(500).json({ error: '삭제에 실패했습니다.' });
  }
});

// ==================== 자기소개 API ====================

// 자기소개 목록 조회
app.get('/api/introductions', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM introductions ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('자기소개 조회 오류:', error);
    res.status(500).json({ error: '자기소개를 불러오는데 실패했습니다.' });
  }
});

// 자기소개 작성
app.post('/api/introductions', upload.array('images', 5), async (req, res) => {
  try {
    const { name, department, content } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: '이름과 내용을 입력해주세요.' });
    }

    // 이미지 업로드
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file.buffer, file.originalname)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    const result = await pool.query(
      'INSERT INTO introductions (name, department, content, images) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, department || '', content, imageUrls]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('자기소개 작성 오류:', error);
    res.status(500).json({ error: '자기소개 작성에 실패했습니다.' });
  }
});

// 자기소개 삭제
app.delete('/api/introductions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM introductions WHERE id = $1', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    console.error('자기소개 삭제 오류:', error);
    res.status(500).json({ error: '삭제에 실패했습니다.' });
  }
});

// ==================== 공지사항 API ====================

// 공지사항 목록 조회
app.get('/api/notices', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notices ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    res.status(500).json({ error: '공지사항을 불러오는데 실패했습니다.' });
  }
});

// 공지사항 작성
app.post('/api/notices', async (req, res) => {
  try {
    const { title, content, author } = req.body;
    
    if (!title || !content || !author) {
      return res.status(400).json({ error: '제목, 내용, 작성자를 모두 입력해주세요.' });
    }

    const result = await pool.query(
      'INSERT INTO notices (title, content, author) VALUES ($1, $2, $3) RETURNING *',
      [title, content, author]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('공지사항 작성 오류:', error);
    res.status(500).json({ error: '공지사항 작성에 실패했습니다.' });
  }
});

// 공지사항 삭제
app.delete('/api/notices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notices WHERE id = $1', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    res.status(500).json({ error: '삭제에 실패했습니다.' });
  }
});

// ==================== 데이터베이스 초기화 함수 ====================
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
    console.error('❌ 데이터베이스 초기화 오류:', error);
  }
}

// ==================== 서버 시작 ====================
app.listen(PORT, async () => {
  console.log('==============================================');
  console.log('한진 2026 신입사원 프리보딩 홈페이지');
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다`);
  console.log('==============================================');
  
  // 데이터베이스 초기화 실행
  await initializeDatabase();
});
