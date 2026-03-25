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
const MY_QQ_EMAIL = '2064849893@qq.com'; // 这里只填一次，下面自动统一引用，避免不一致

const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: MY_QQ_EMAIL, // 认证登录邮箱，和上面的变量完全一致
    pass: process.env.EMAIL_PASS // 从.env读取SMTP授权码
  },
  connectionTimeout: 10 * 1000,
  socketTimeout: 15 * 1000
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
                from: `烟台旅游留言 <2064849893@qq.com>`, // 必须和认证邮箱一致
                to: '2064849893@qq.com',
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
