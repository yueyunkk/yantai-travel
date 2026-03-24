const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
// 本地测试用3000端口，部署时平台会自动分配端口
const PORT = process.env.PORT || 3000;

// ---------------- 中间件配置 ----------------
app.use(cors()); // 允许跨域请求
app.use(bodyParser.json()); // 解析前端发来的JSON数据
// 托管public文件夹里的前端页面（这样访问根目录就能看到首页）
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- 邮箱配置（必须修改！） ----------------
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com', // 如果你用163邮箱，改成 smtp.163.com
  port: 465,
  secure: true,
  auth: {
    user: '2064849893@qq.com', // 改成你的发送邮箱（比如你的QQ邮箱）
    pass: 'jbuweecavezbcgaa' // 改成你的SMTP授权码（不是邮箱密码！）
  }
});

// ---------------- 处理留言提交的接口 ----------------
app.post('/send-email', async (req, res) => {
  try {
    // 1. 获取前端提交的数据
    const { name, phone, email, subject, message } = req.body;

    // 2. 简单验证必填项
    if (!name || !phone || !subject || !message) {
      return res.json({ success: false, message: '请填写必填的姓名、电话、咨询类型和留言！' });
    }

    // 3. 构造邮件内容
    const mailOptions = {
      from: `烟台旅游留言 <2064849893@qq.com>`, // 发件人（和上面user一致）
      to: '2064849893@qq.com', // 改成你接收留言的邮箱（可以和发件人一样）
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

    // 4. 发送邮件
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: '留言提交成功！我们会尽快与您联系 😊' });

  } catch (error) {
    console.error('邮件发送失败：', error);
    res.json({ success: false, message: '服务器出错了，请稍后重试！' });
  }
});

// ---------------- 启动服务器 ----------------
app.listen(PORT, () => {
  console.log(`✅ 服务器已启动！`);
  console.log(`📱 本地测试地址：http://localhost:${PORT}`);
});
