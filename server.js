require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Resend 邮件服务配置
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// PostgreSQL 数据库配置
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Railway PostgreSQL 必须配置
  }
});

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
// 托管前端静态页面
app.use(express.static(path.join(__dirname, 'public')));

// --------------------------
// 数据库初始化（自动建表）
// --------------------------
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ PostgreSQL 连接失败：', err.stack);
  }
  console.log('✅ PostgreSQL 数据库已连接');
  
  // 自动创建「留言表」和「访问统计表」
  const createTables = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      page VARCHAR(255) NOT NULL,
      ip VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  client.query(createTables, (err, res) => {
    release();
    if (err) {
      console.error('❌ 创建表失败：', err.stack);
    } else {
      console.log('✅ 数据库表已就绪');
    }
  });
});

// --------------------------
// 核心接口：留言提交（存数据库 + 发邮件）
// --------------------------
app.post('/send-email', async (req, res) => {
  console.log('收到留言提交请求');
  try {
    const { name, phone, email, subject, message } = req.body;

    // 1. 校验必填项
    if (!name || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: '请填写姓名、电话、咨询类型和留言内容！'
      });
    }

    // 2. 把留言存入 PostgreSQL 数据库
    const insertQuery = `INSERT INTO messages (name, phone, email, subject, message) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    pool.query(insertQuery, [name, phone, email || '', subject, message], (err, result) => {
      if (err) {
        console.error('❌ 存入数据库失败：', err.stack);
      } else {
        console.log('✅ 留言已存入数据库，ID：', result.rows[0].id);
      }
    });

    // 3. 发送邮件（Resend 版本）
    console.log('📤 正在发送邮件...');
    const { data, error } = await resend.emails.send({
      from: '烟台旅游留言 <no-reply@yueyunkk.fun>', // 等域名验证通过后改成：<no-reply@yueyunkk.fun>
     to: ['yueyunkk@outlook.com'],// 先临时用 QQ 邮箱，验证通过后改成：['yueyunkk@outlook.com']
      subject: `【烟台旅游新留言】${name} - ${subject}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #e63946; text-align: center;">您有一条新的烟台旅游留言</h2>
          <hr>
          <p><strong>姓名：</strong>${name}</p>
          <p><strong>电话：</strong>${phone}</p>
          <p><strong>邮箱：</strong>${email || '用户未填写'}</p>
          <p><strong>咨询类型：</strong>${subject}</p>
          <p><strong>留言内容：</strong></p>
          <p style="background: #f8f9fa; padding: 15px; border-radius: 8px;">${message}</p>
          <hr>
          <p style="text-align: center; color: #888; font-size: 12px;">提交时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `
    });

    if (error) throw error;
    console.log('✅ 邮件发送成功！');

    res.json({
      success: true,
      message: '留言提交成功！我们会尽快与您联系 😊'
    });

  } catch (error) {
    console.error('❌ 提交失败：', error);
    res.status(500).json({
      success: false,
      message: `服务器出错：${error.message}`
    });
  }
});

// --------------------------
// 接口1：记录页面访问量
// --------------------------
app.post('/api/visit', (req, res) => {
  const { page } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const insertVisit = `INSERT INTO visits (page, ip) VALUES ($1, $2)`;
  pool.query(insertVisit, [page || 'unknown', ip], (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

// --------------------------
// 接口2：获取所有留言和统计数据
// --------------------------
app.get('/api/stats', async (req, res) => {
  try {
    // 并行查询：留言总数、访问总数、最近10条留言
    const [msgCount, visitCount, recentMsgs] = await Promise.all([
      pool.query('SELECT COUNT(*) as total_messages FROM messages'),
      pool.query('SELECT COUNT(*) as total_visits FROM visits'),
      pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 10')
    ]);

    res.json({
      success: true,
      data: {
        total_messages: parseInt(msgCount.rows[0].total_messages),
        total_visits: parseInt(visitCount.rows[0].total_visits),
        recent_messages: recentMsgs.rows
      }
    });
  } catch (err) {
    console.error('❌ 查询统计失败：', err.stack);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

// --------------------------
// Railway 健康检查接口
// --------------------------
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// --------------------------
// 启动服务器
// --------------------------
app.listen(PORT, HOST, () => {
  console.log('✅ 服务器已启动！');
  console.log(`📱 本地测试地址：http://localhost:${PORT}`);
});
