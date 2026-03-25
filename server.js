const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
// Railway自动分配端口，本地测试默认3000
const PORT = process.env.PORT || 3000;
// 适配Railway容器环境，必须监听0.0.0.0
const HOST = '0.0.0.0';

// ==================== 中间件配置（无需修改） ====================
// 允许跨域请求
app.use(cors());
// 解析前端提交的JSON数据
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
// 托管public文件夹里的前端页面（你的html、css、图片都放在这里）
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ==================== 【⚠️ 163邮箱核心配置，必须修改】 ====================
// 1. 发件人邮箱：你的完整163邮箱地址
const EMAIL_SENDER = '15253500323@163.com';
// 2. 收件人邮箱：接收留言的邮箱，可以和发件人一致，也可以填其他邮箱
const EMAIL_RECEIVER = '15253500323@163.com';

// 初始化163邮箱发送器（配置已适配163邮箱规则，无需修改）
let transporter = null;
try {
  console.log('📧 正在初始化163邮箱服务...');
  // 校验环境变量里的授权码
  if (!process.env.EMAIL_PASS) {
    throw new Error('未读取到EMAIL_PASS环境变量！请在Railway的Variables里配置163邮箱的SMTP授权码');
  }

  // 163邮箱专属SMTP配置
  transporter = nodemailer.createTransport({
    host: 'smtp.163.com', // 163邮箱固定SMTP地址，不要修改
    port: 465, // 163邮箱SSL固定端口，不要修改
    secure: true, // 开启SSL加密，必须开启
    auth: {
      user: EMAIL_SENDER, // 你的163发件邮箱
      pass: process.env.EMAIL_PASS // 163邮箱SMTP授权码（从Railway环境变量读取）
    },
    // 超时配置，杜绝接口卡死无响应
    connectionTimeout: 10 * 1000, // 连接超时10秒
    greetingTimeout: 10 * 1000, // 握手超时10秒
    socketTimeout: 15 * 1000, // 传输超时15秒
    // 连接池配置，提升发送稳定性
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });

  // 启动时验证邮箱连接是否正常
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ 163邮箱SMTP连接失败：', error.message);
    } else {
      console.log('✅ 163邮箱SMTP连接成功！可正常发送邮件');
    }
  });

} catch (error) {
  console.error('❌ 邮箱服务初始化失败：', error.message);
}

// ==================== 接口配置（无需修改） ====================
// 健康检查接口：Railway用这个判断服务是否正常运行
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 根路径：直接返回网站首页
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 留言提交核心接口：前端contact.html里的表单会请求这个接口
app.post('/send-email', async (req, res) => {
  console.log('📥 收到用户留言提交请求');
  // 接口超时控制：15秒内必须返回结果，杜绝浏览器主动断开请求
  const requestTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('❌ 接口处理超时');
      return res.status(504).json({
        success: false,
        message: '请求超时，请稍后重试！'
      });
    }
  }, 15000);

  try {
    // 1. 获取前端提交的表单数据
    const { name, phone, email, subject, message } = req.body;

    // 2. 校验必填项
    if (!name || !phone || !subject || !message) {
      clearTimeout(requestTimeout);
      return res.status(400).json({
        success: false,
        message: '请填写姓名、电话、咨询类型和留言内容！'
      });
    }

    // 3. 检查邮箱服务是否就绪
    if (!transporter) {
      clearTimeout(requestTimeout);
      return res.status(500).json({
        success: false,
        message: '邮件服务未就绪，请联系网站管理员！'
      });
    }

    // 4. 构造邮件内容（可自行修改样式）
    const mailOptions = {
      from: `烟台旅游留言 <${EMAIL_SENDER}>`, // 发件人，必须和上面的发件邮箱完全一致，否则163会拦截
      to: EMAIL_RECEIVER, // 收件人
      subject: `【烟台旅游新留言】${name} - ${subject}`, // 邮件标题
      // 邮件正文（HTML格式，可自行修改样式）
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

    // 5. 发送邮件
    console.log('📤 正在发送邮件到收件箱...');
    await transporter.sendMail(mailOptions);
    console.log('✅ 邮件发送成功！');

    // 6. 给前端返回成功结果
    clearTimeout(requestTimeout);
    res.json({
      success: true,
      message: '留言提交成功！我们会尽快与您联系 😊'
    });

  } catch (error) {
    // 全量捕获异常，给前端返回明确的错误原因
    clearTimeout(requestTimeout);
    console.error('❌ 留言提交失败：', error.message);
    res.status(500).json({
      success: false,
      message: `提交失败：${error.message.includes('timeout') ? '邮件发送超时，请稍后重试' : error.message}`
    });
  }
});

// ==================== 启动服务器（无需修改） ====================
try {
  app.listen(PORT, HOST, () => {
    console.log('=====================================');
    console.log(`✅ 服务器已成功启动！`);
    console.log(`🌐 监听地址：http://${HOST}:${PORT}`);
    console.log(`📱 本地测试地址：http://localhost:${PORT}`);
    console.log('=====================================');
  });
} catch (error) {
  console.error('❌ 服务器启动失败：', error);
  process.exit(1);
}
