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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// 邮箱配置
let transporter = null;
try {
  transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: '2064849893@qq.com',
      pass: process.env.EMAIL_PASS
    }
  });

  // 启动时验证邮箱连接
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ 邮箱服务连接失败：', error);
    } else {
      console.log('✅ 邮箱服务连接正常，可发送邮件');
    }
  });
} catch (error) {
  console.error('❌ 邮箱初始化失败：', error);
}

// 健康检查接口
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 根路径返回首页
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 留言提交接口（全日志版）
app.post('/send-email', async (req, res) => {
  console.log('📥 收到留言提交请求，请求体：', req.body);
  try {
    const { name, phone, email, subject, message } = req.body;

    // 校验必填项
    if (!name || !phone || !subject || !message) {
      console.log('❌ 表单校验失败，缺少必填项');
      return res.status(400).json({
        success: false,
        message: '请填写姓名、电话、咨询类型和留言内容！'
      });
    }

    // 检查邮箱服务
    if (!transporter) {
      console.log('❌ 邮箱服务未就绪');
      return res.status(500).json({
        success: false,
        message: '邮件服务未就绪，请稍后重试！'
      });
    }

    // 构造邮件
    const mailOptions = {
      from: `烟台旅游留言 <2064849893@qq.com>`,
      to: '2064849893@qq.com',
      subject: `【烟台旅游新留言】${name} - ${subject}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #e63946; text-align: center;">您有一条新的烟台旅游留言</h2>
          <hr style="border: 1px solid #f0f0f0;">
          <p><strong style="color: #1d3557;">姓名：</strong>${name}</p>
          <p><strong style="color: #1d3557;">电话：</strong>${phone}</p>
          <p><strong style="color: #1d3557;">邮箱：</strong>${email || '用户未填写'}</p>
          <p><strong style="color: #1d3557;">咨询类型：</strong>${subject}</p>
          <p><strong style="color: #1d3557;">留言内容：</strong></p>
          <p style="background: #f8f9fa; padding: 15px; border-radius: 8px;">${message}</p>
          <hr style="border: 1px solid #f0f0f0;">
          <p style="text-align: center; color: #888; font-size: 12px;">提交时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `
    };

    // 发送邮件
    console.log('📤 开始发送邮件...');
    await transporter.sendMail(mailOptions);
    console.log('✅ 邮件发送成功！');
    res.json({
      success: true,
      message: '留言提交成功！我们会尽快与您联系 😊'
    });

  } catch (error) {
    console.error('❌ 接口处理失败，详细错误：', error);
    res.status(500).json({
      success: false,
      message: '服务器处理失败：' + error.message
    });
  }
});

// 启动服务器
try {
  app.listen(PORT, HOST, () => {
    console.log('=====================================');
    console.log(`✅ 服务器已成功启动！`);
    console.log(`🌐 监听地址：http://${HOST}:${PORT}`);
    console.log(`🏥 健康检查地址：http://${HOST}:${PORT}/health`);
    console.log('=====================================');
  });
} catch (error) {
  console.error('❌ 服务器启动失败：', error);
  process.exit(1);
}
