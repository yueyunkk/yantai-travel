require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Resend 邮件服务配置
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
// 托管前端静态页面
app.use(express.static(path.join(__dirname, 'public')));

// 留言提交接口
app.post('/send-email', async (req, res) => {
  console.log('收到留言提交请求');
  try {
    const { name, phone, email, subject, message } = req.body;

    // 校验必填项
    if (!name || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: '请填写姓名、电话、咨询类型和留言内容！'
      });
    }

    // 发送邮件（Resend 官方接口）
    console.log('📤 正在发送邮件...');
    const { data, error } = await resend.emails.send({
      from: '烟台旅游留言 <onboarding@resend.dev>',
      to: ['yueyunkk@outlook.com'],
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
    console.error('❌ 邮件发送失败：', error);
    res.status(500).json({
      success: false,
      message: `服务器出错：${error.message}`
    });
  }
});

// Railway 健康检查接口
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log('✅ 服务器已启动！');
  console.log(`📱 本地测试地址：http://localhost:${PORT}`);
});
