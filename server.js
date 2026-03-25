const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
// 适配Railway自动分配的端口，绝对不能写死
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// ==================== 中间件配置 ====================
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ==================== 163邮箱配置（强制IPv4修复版） ====================
const EMAIL_SENDER = '15253500323@163.com';
const EMAIL_RECEIVER = '15253500323@163.com';

let transporter = null;
try {
  console.log('📧 正在初始化163邮箱服务（强制IPv4模式）...');
  if (!process.env.EMAIL_PASS) {
    throw new Error('未读取到EMAIL_PASS环境变量！请检查Railway的Variables配置');
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.163.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_SENDER,
      pass: process.env.EMAIL_PASS
    },
    // 【核心修复】强制使用IPv4连接，禁用IPv6
    family: 4,
    // 网络超时配置，适配海外环境
    connectionTimeout: 15 * 1000,
    greetingTimeout: 15 * 1000,
    socketTimeout: 20 * 1000,
    // 关闭连接池，避免海外网络长连接异常
    pool: false,
    // 开启调试日志，方便排查问题
    debug: true,
    logger: true
  });

  // 验证邮箱连接
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ 163邮箱SMTP连接失败：', error);
    } else {
      console.log('✅ 163邮箱SMTP连接成功！可正常发送邮件');
    }
  });

} catch (error) {
  console.error('❌ 邮箱服务初始化失败：', error);
}

// ==================== 接口配置 ====================
// 健康检查接口
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 留言提交接口
app.post('/send-email', async (req, res) => {
  console.log('📥 收到用户留言提交请求');
  const requestTimeout = setTimeout(() => {
    if (!res.headersSent) {
      return res.status(504).json({
        success: false,
        message: '请求超时，请稍后重试！'
      });
    }
  }, 20000);

  try {
    const { name, phone, email, subject, message } = req.body;

    if (!name || !phone || !subject || !message) {
      clearTimeout(requestTimeout);
      return res.status(400).json({
        success: false,
        message: '请填写姓名、电话、咨询类型和留言内容！'
      });
    }

    if (!transporter) {
      clearTimeout(requestTimeout);
      return res.status(500).json({
        success: false,
        message: '邮件服务未就绪，请联系管理员！'
      });
    }

    const mailOptions = {
      from: `烟台旅游留言 <${EMAIL_SENDER}>`,
      to: EMAIL_RECEIVER,
      subject: `【烟台旅游新留言】${name} - ${subject}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; font-family: 微软雅黑, sans-serif;">
          <h2 style="color: #e63946; text-align: center; margin: 0 0 20px 0;">您有一条新的烟台旅游留言</h2>
          <hr style="border: 1px solid #f0f0f0; margin: 15px 0;">
          <p style="font-size: 16px; line-height: 1.8;"><strong style="color: #1d3557;">用户姓名：</strong>${name}</p>
          <p style="font-size: 16px; line-height: 1.8;"><strong style="color: #1d3557;">联系电话：</strong>${phone}</p>
          <p style="font-size: 16px; line-height: 1.8;"><strong style="color: #1d3557;">联系邮箱：</strong>${email || '用户未填写'}</p>
          <p style="font-size: 16px; line-height: 1.8;"><strong style="color: #1d3557;">咨询类型：</strong>${subject}</p>
          <p style="font-size: 16px; line-height: 1.8;"><strong style="color: #1d3557;">留言内容：</strong></p>
          <p style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 15px; line-height: 1.8; margin: 10px 0;">${message}</p>
          <hr style="border: 1px solid #f0f0f0; margin: 15px 0;">
          <p style="text-align: center; color: #888; font-size: 12px; margin: 0;">提交时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `
    };

    console.log('📤 正在发送邮件...');
    await transporter.sendMail(mailOptions);
    console.log('✅ 邮件发送成功！');

    clearTimeout(requestTimeout);
    res.json({
      success: true,
      message: '留言提交成功！我们会尽快与您联系 😊'
    });

  } catch (error) {
    clearTimeout(requestTimeout);
    console.error('❌ 留言提交失败：', error);
    res.status(500).json({
      success: false,
      message: `提交失败：${error.message}`
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
