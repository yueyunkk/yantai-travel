const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
// Railway自动分配端口，本地测试用3000
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
// 托管public里的前端页面，访问根目录直接打开首页
app.use(express.static(path.join(__dirname, 'public')));

// 邮箱配置（QQ邮箱示例，163邮箱改smtp地址即可）
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: '264849893@qq.com', // 你的发件邮箱
    pass: process.env.EMAIL_PASS // 邮箱SMTP授权码，后面在Railway配置
  }
});

// 留言提交接口，和contact.html里的提交逻辑对应
app.post('/send-email', async (req, res) => {
  try {
    const { name, phone, email, subject, message } = req.body;
    // 校验必填项
    if (!name || !phone || !subject || !message) {
      return res.json({ success: false, message: '请填写姓名、电话、咨询类型和留言内容！' });
    }

    // 构造邮件内容
    const mailOptions = {
      from: `烟台旅游留言 <264849893@qq.com>`,
      to: '264849893@qq.com', // 你接收留言的邮箱
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
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: '留言提交成功！我们会尽快与您联系 😊' });

  } catch (error) {
    console.error('邮件发送失败：', error);
    res.json({ success: false, message: '服务器出错了，请稍后重试！' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ 服务器已启动！`);
  console.log(`📱 本地测试地址：http://localhost:${PORT}`);
});