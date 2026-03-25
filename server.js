require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
// 【关键】Railway自动分配PORT环境变量，本地默认3000
const PORT = process.env.PORT || 3000;
// 【关键】适配Railway容器环境，必须监听0.0.0.0
const HOST = '0.0.0.0';

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
// 托管public里的前端页面
app.use(express.static(path.join(__dirname, 'public')));

// ==================== 邮箱配置（统一邮箱，修复501报错） ====================
const MY_QQ_EMAIL = 'yueyunkk@outlook.com'; // 这里只填一次，下面自动统一引用，避免不一致

const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com', // 严格按图片里的SMTP服务器填写
  port: 587,                    // 固定端口 587
  secure: false,               // 587 端口用 STARTTLS，所以 secure 必须是 false
  auth: {
    user: 'yueyunkk@outlook.com', // 填写你的完整 Outlook 邮箱
    pass: process.env.EMAIL_PASS        // 填写：
                                       // 1. 若未开双重验证 → 你的 Outlook 登录密码
                                       // 2. 若已开双重验证 → 必须去「账号安全」生成「应用密码」
  },
   // 新增：延长所有超时时间到 60 秒
  connectionTimeout: 60000, // 连接超时 60 秒
  greetingTimeout: 60000,    // 握手超时 60 秒
  socketTimeout: 60000,      // 传输超时 60 秒
  tls: {
    ciphers: 'SSLv3', // 解决部分环境的 TLS 兼容问题（可选，不加也可能正常）
    rejectUnauthorized: false // 避免证书校验报错（可选）
  }
});

// 留言提交接口
app.post('/send-email', (req, res) => {
    console.log('📥 收到留言提交请求');

    // 【关键修复】创建一个async函数来执行包含await的逻辑
    const sendEmail = async () => {
        try {
            const { name, phone, email, subject, message } = req.body;

            // 1. 校验必填项
            if (!name || !phone || !subject || !message) {
                return res.status(400).json({
                    success: false,
                    message: '请填写姓名、电话、咨询类型和留言内容！'
                });
            }

            // 2. 构造邮件内容
            const mailOptions = {
                from: `烟台旅游留言 <yueyunkk@outlook.com>`, // 必须和认证邮箱一致
                to: 'yueyunkk@outlook.com',
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
            };

            // 3. 发送邮件（现在在async函数里，可以正常使用await）
            console.log('📤 正在发送邮件...');
            await transporter.sendMail(mailOptions);
            console.log('✅ 邮件发送成功！');

            // 4. 返回成功结果
            res.json({
                success: true,
                message: '留言提交成功！我们会尽快与您联系 😊'
            });

        } catch (error) {
            console.error('❌ 邮件发送失败：', error);
            res.status(500).json({
                success: false,
                message: `服务器出错：${error.message}`
            });
        }
    };

    // 执行这个async函数
    sendEmail();
});
// 健康检查接口（Railway用）
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log('✅ 服务器已启动！');
  console.log(`📱 本地测试地址：http://localhost:${PORT}`);
});
