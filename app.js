const express = require('express')
const ejs = require('ejs')
const bodyParser = require('body-parser')
const mysql = require('mysql2');
require('dotenv').config();
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', './views');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse JSON
app.use(bodyParser.json())
// app uses static files from 'public' folder
app.use(express.static(__dirname+'/public'))

// MySQL connection Pool :
// MySQL 커넥션을 사용할 때는 주로 커넥션 풀을 이용하여 관리하는 것이 권장
// 여러 요청이 동시에 처리될 때 효율적으로 커넥션을 관리
const connectionPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    connectionLimit: 10, // 최대 연결 수 설정
    insecureAuth: true,
});

// 방문자 수 카운트
let visitorCount = 0;

// MySQL connection check
connectionPool.getConnection((err, connection) => {
    if (err) {
      console.error('MySQL에 연결 중 에러 발생:', err);
    } else {
      console.log('MySQL에 연결되었습니다.');
      connection.release();
    }
});

// Routes
app.get('/', (req, res) => {
    visitorCount++;
    res.render('index', { visitorCount });
});

app.get('/blog', (req, res) => {
    res.render('blog');
})

app.get('/users', (req, res) => {
    res.render('users');
})

app.get('/visit', (req, res) => {
    res.render('visit');
})
  
app.get('/contact', (req, res) => {
    res.render('contact');
})

// 방명록 작성 페이지
app.get('/guestbook', (req, res) => {
    res.render('guestbook'); // guestbook.ejs 파일을 생성하세요.
});

// 방명록 등록 처리
app.post('/api/guestbook', (req, res) => {
    const name = req.body.name;
    const message = req.body.message;

    const insertQuery = `INSERT INTO guestbook (name, message, created_at) VALUES (?, ?, NOW())`;
    connectionPool.query(insertQuery, [name, message], (err, result) => {
        if (err) {
            console.error('데이터 등록 중 에러 발생:', err);
            return res.status(500).send('내부 서버 오류');
        }

        // 성공 메시지 전송
        res.redirect('/guestbook/list?message=방명록이 등록되었습니다.'); // 메시지를 쿼리 파라미터로 전달
    });
});

// 방명록 목록 조회
app.get('/guestbook/list', (req, res) => {
    const selectQuery = `SELECT * FROM guestbook ORDER BY created_at DESC`;
    connectionPool.query(selectQuery, (err, result) => {
        if (err) {
            console.error('데이터 조회 중 에러 발생:', err);
            return res.status(500).send('내부 서버 오류');
        }
        res.render('guestbookList', { lists: result }); // guestbookList.ejs 파일을 생성하세요.
    });
});

// 방명록 수정 페이지
app.get('/guestbook/edit/:id', (req, res) => {
    const id = req.params.id;
    const selectQuery = `SELECT * FROM guestbook WHERE id = ?`;
    connectionPool.query(selectQuery, [id], (err, result) => {
        if (err) {
            console.error('데이터 조회 중 에러 발생:', err);
            return res.status(500).send('내부 서버 오류');
        }
        res.render('guestbookEdit', { guestbook: result[0] }); // 수정 페이지를 위한 EJS 파일
    });
});

// 방명록 수정 처리
app.post('/api/guestbook/edit/:id', (req, res) => {
    const id = req.params.id;
    const name = req.body.name;
    const message = req.body.message;

    const updateQuery = `UPDATE guestbook SET name = ?, message = ? WHERE id = ?`;
    connectionPool.query(updateQuery, [name, message, id], (err, result) => {
        if (err) {
            console.error('데이터 업데이트 중 에러 발생:', err);
            return res.status(500).send('내부 서버 오류');
        }
        res.redirect('/guestbook/list'); // 수정 후 목록으로 리다이렉트
    });
});


// 방명록 삭제 처리
app.post('/api/guestbook/delete/:id', (req, res) => {
    const id = req.params.id;
    const deleteQuery = `DELETE FROM guestbook WHERE id = ?`;
    connectionPool.query(deleteQuery, [id], (err, result) => {
        if (err) {
            console.error('데이터 삭제 중 에러 발생:', err);
            return res.status(500).send('내부 서버 오류');
        }
        res.redirect('/guestbook/list'); // 삭제 후 목록으로 리다이렉트
    });
});



app.post('/api/contact', (req, res) => {
    // const { name, phone, email, memo } = req.body; // 구조 분해 + 각 변수 할당
    const name = req.body.name;
    const phone = req.body.phone;
    const email = req.body.email;
    const memo = req.body.memo;
  
    const insertQuery = `INSERT INTO contact(name, phone, email, memo, create_at, modify_at) VALUES ('${name}', '${phone}', '${email}', '${memo}', NOW(), NOW())`;
  
    connectionPool.query(insertQuery, (err, result) => {
        if (err) {
            console.error('데이터 삽입 중 에러 발생:', err);
            return res.status(500).json({ message: '내부 서버 오류' }); // JSON 응답
        }
        
        console.log('데이터가 삽입되었습니다.');
        res.status(201).json({ message: '문의사항이 등록되었습니다.', contactId: result.insertId }); // JSON 응답
    });
});

app.get('/contactList', (req, res) => {
    const selectQuery = `select * from contact order by id desc`;

    // 얻어온 커넥션을 사용하여 쿼리를 실행합니다.
    connectionPool.query(selectQuery, (err, result) => {
        if (err) {
            console.error('데이터 조회 중 에러 발생:', err);
            res.status(500).send('내부 서버 오류');
        } else {
            console.log('데이터가 조회되었습니다.');
            console.log(result);
            res.render('contactList', {lists:result});
        }
    });
});

app.delete('/api/contactDelete/:id', (req, res) => {
    const id = req.params.id;
    const deleteQuery = `delete from contact where id='${id}'`;
    connectionPool.query(deleteQuery, (err, result) => {
        if (err) {
            console.error('데이터 삭제 중 에러 발생:', err);
            res.status(500).send('내부 서버 오류');
        } else {
            console.log('데이터가 삭제되었습니다.');
            res.send("<script>alert('문의사항이 삭제되었습니다.'); location.href='/contactList'</script>");
        }
    });
});

app.put('/api/contactUpdate/:id', (req, res) => {
    const id = req.params.id;
    const status = "done";
    const updateQuery = `UPDATE contact SET status = '${status}' WHERE id = '${id}';`;

    connectionPool.query(updateQuery, (err, result) => {
        if (err) {
            console.error('데이터 업데이트 중 에러 발생:', err);
            res.status(500).send('내부 서버 오류');
        } else {
            console.log('데이터가 업데이트되었습니다.');
            res.send("<script>alert('문의사항이 업데이트되었습니다.'); location.href='/contactList'</script>");
        }
    });
});

// Server listener
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});