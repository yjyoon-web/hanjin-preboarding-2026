const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./hanjin_preboarding.db', (err) => {
    if (err) {
        console.error('데이터베이스 생성 오류:', err);
        process.exit(1);
    } else {
        console.log('데이터베이스 파일 생성 완료');
    }
});

// 테이블 생성 및 초기 데이터 삽입
db.serialize(() => {
    console.log('테이블 생성 중...');

    // 사용자 테이블
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('users 테이블 생성 오류:', err);
        else console.log('✓ users 테이블 생성 완료');
    });

    // 공지사항 테이블
    db.run(`
        CREATE TABLE IF NOT EXISTS notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) console.error('notices 테이블 생성 오류:', err);
        else console.log('✓ notices 테이블 생성 완료');
    });

    // 방명록 테이블 (이미지 필드 추가)
    db.run(`
        CREATE TABLE IF NOT EXISTS guestbook (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            author_id INTEGER,
            images TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) console.error('guestbook 테이블 생성 오류:', err);
        else console.log('✓ guestbook 테이블 생성 완료 (이미지 필드 포함)');
    });

    // 자기소개 테이블 (이미지 필드 추가)
    db.run(`
        CREATE TABLE IF NOT EXISTS introductions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author_id INTEGER,
            images TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) console.error('introductions 테이블 생성 오류:', err);
        else console.log('✓ introductions 테이블 생성 완료 (이미지 필드 포함)');
    });

    // 초기 관리자 계정 생성
    console.log('\n초기 데이터 삽입 중...');
    
    bcrypt.hash('admin123', 10, (err, hashedPassword) => {
        if (err) {
            console.error('비밀번호 해싱 오류:', err);
            return;
        }

        db.run(
            'INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
            ['admin', hashedPassword, '관리자', 'admin'],
            function (err) {
                if (err) {
                    console.error('관리자 계정 생성 오류:', err);
                } else {
                    console.log('✓ 관리자 계정 생성 완료');
                    console.log('  - 아이디: admin');
                    console.log('  - 비밀번호: admin123');
                }

                // 샘플 공지사항 생성
                db.run(
                    'INSERT OR IGNORE INTO notices (id, title, content, author_id) VALUES (?, ?, ?, ?)',
                    [
                        1,
                        '한진 2026년 신입사원 프리보딩에 오신 것을 환영합니다! 🎉',
                        `안녕하세요, 한진 가족이 되신 것을 진심으로 환영합니다!

이 프리보딩 홈페이지는 신입사원 여러분이 입사 전 서로 소통하고 친해질 수 있도록 마련된 공간입니다.

📌 주요 기능:
• 공지사항: 회사 소식 및 중요한 안내사항을 확인하세요
• 방명록: 간단한 인사말과 함께 사진을 공유해보세요 (최대 5장)
• 자기소개: 본인을 소개하고 다른 동기들을 알아가세요 (사진 업로드 가능)

💡 사진 업로드 기능:
• 방명록과 자기소개에 사진을 여러 장(최대 5장) 업로드할 수 있습니다
• JPG, PNG, GIF 등 이미지 파일을 지원합니다
• 각 사진은 최대 5MB까지 업로드 가능합니다

입사 전 이 공간을 통해 먼저 친해지시고, 설레는 마음으로 첫 출근을 준비하세요!

문의사항이 있으시면 언제든 관리자에게 연락주세요.

다시 한번 환영합니다! 🙌`,
                        1
                    ],
                    function (err) {
                        if (err) {
                            console.error('샘플 공지사항 생성 오류:', err);
                        } else {
                            console.log('✓ 환영 공지사항 생성 완료');
                        }

                        console.log('\n========================================');
                        console.log('데이터베이스 초기화가 완료되었습니다!');
                        console.log('========================================');
                        console.log('\n다음 명령어로 서버를 실행하세요:');
                        console.log('  npm start');
                        console.log('\n그 다음 브라우저에서 접속:');
                        console.log('  http://localhost:3000');
                        console.log('========================================\n');

                        db.close();
                    }
                );
            }
        );
    });
});
