const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ==================== 邮箱配置（兼容模式） ====================
const EMAIL_SENDER = '15253500323@163.com';
const EMAIL_RECEIVER = '15253500323@163.com';

let transporter = null;
let mailServiceReady = false;

try {
  console.log('📧 正在初始化邮件服务...');
  if (process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: 'smtp.163.com',
      port: 465,
      secure: true,
      auth: {
        user: EMAIL_SENDER,
        pass: process.env.EMAIL_PASS
      },
      family: 4, // 强制IPv4
      connectionTimeout: 10 * 1000,
      socketTimeout: 10 * 1000,
      pool: false
    });

    // 验证连接，标记服务状态
    transporter.verify((error) => {
      if (error) {
        console.warn('⚠️ 邮件服务连接失败，将启用兼容模式：留言仅打印到日志', error.message);
        mailServiceReady = false;
      } else {
        console.log('✅ 邮件服务连接成功！');
        mailServiceReady = true;
      }
    });
  } else {
    console.warn('⚠️ 未配置EMAIL_PASS，启用兼容模式');
  }
} catch (error) {
  console.warn('⚠️ 邮件服务初始化失败，启用兼容模式', error.message);
}

// ==================== 接口配置 ====================
// 健康检查
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 留言提交接口（兼容模式）
app.post('/send-email', async (req, res) => {
  console.log('📥 收到用户留言：', req.body);
  try {
    const { name, phone, email, subject, message } = req.body;

    // 校验必填项
    if (!name || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: '请填写姓名、电话、咨询类型和留言内容！'
      });
    }

    // 如果邮件服务就绪，尝试发送邮件
    if (mailServiceReady && transporter) {
      try {
        const mailOptions = {
          from: `烟台旅游留言 <${EMAIL_SENDER}>`,
          to: EMAIL_RECEIVER,
          subject: `【烟台旅游新留言】${name} - ${subject}`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #e63946; text-align: center;">烟台旅游新留言</h2>
              <p><strong>姓名：</strong>${name}</p>
              <p><strong>电话：</strong>${phone}</p>
              <p><strong>邮箱：</strong>${email || '未填写'}</p>
              <p><strong>咨询类型：</strong>${subject}</p>
              <p><strong>留言内容：</strong>${message}</p>
              <p style="text-align: center; color: #888; font-size: 12px;">提交时间：${new Date().toLocaleString('zh-CN')}</p>
            </div>
          `
        };
        await transporter.sendMail(mailOptions);
        console.log('✅ 邮件发送成功！');
      } catch (mailError) {
        console.warn('⚠️ 邮件发送失败，留言已保存到日志：', mailError.message);
      }
    }

    // 无论邮件是否发送成功，都给前端返回成功提示
    res.json({
      success: true,
      message: '留言提交成功！我们会尽快与您联系 😊'
    });

  } catch (error) {
    console.error('❌ 接口处理失败：', error);
    res.status(500).json({
      success: false,
      message: '提交失败，请稍后重试！'
    });
  }
});

// 启动服务器
try {
  app.listen(PORT, HOST, () => {
    console.log('=====================================');
    console.log(`✅ 服务器已成功启动！`);
    console.log(`🌐 监听端口：${PORT}`);
    console.log('=====================================');
  });
} catch (error) {
  console.error('❌ 服务器启动失败：', error);
  process.exit(1);
}
