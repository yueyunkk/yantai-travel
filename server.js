const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
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
// 留言提交接口 - 全容错版
app.post('/send-email', async (req, res) => {
  console.log('📥 收到留言提交请求，请求体：', req.body);
  try {
    // 1. 安全获取表单数据，避免undefined报错
    const name = req.body?.name?.trim() || '';
    const phone = req.body?.phone?.trim() || '';
    const email = req.body?.email?.trim() || '用户未填写';
    const subject = req.body?.subject?.trim() || '';
    const message = req.body?.message?.trim() || '';

    // 2. 校验必填项，提前返回错误
    if (!name || !phone || !subject || !message) {
      console.log('❌ 表单校验不通过，缺少必填项');
      return res.status(400).json({ 
        success: false, 
        message: '请填写姓名、电话、咨询类型和留言内容！' 
      });
    }

    // 3. 安全校验邮箱配置，避免配置错误导致崩溃
    if (!transporter) {
      console.log('❌ 邮件发送器未初始化');
      return res.status(500).json({ 
        success: false, 
        message: '邮件服务未就绪，请稍后重试！' 
      });
    }

    // 4. 构造邮件内容
    const mailOptions = {
      from: `烟台旅游留言 <264849893@qq.com>`,
      to: '264849893@qq.com',
      subject: `【烟台旅游新留言】${name} - ${subject}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #e63946; text-align: center;">您有一条新的烟台旅游留言</h2>
          <hr style="border: 1px solid #f0f0f0;">
          <p><strong style="color: #1d3557;">姓名：</strong>${name}</p>
          <p><strong style="color: #1d3557;">电话：</strong>${phone}</p>
          <p><strong style="color: #1d3557;">邮箱：</strong>${email}</p>
          <p><strong style="color: #1d3557;">咨询类型：</strong>${subject}</p>
          <p><strong style="color: #1d3557;">留言内容：</strong></p>
          <p style="background: #f8f9fa; padding: 15px; border-radius: 8px;">${message}</p>
          <hr style="border: 1px solid #f0f0f0;">
          <p style="text-align: center; color: #888; font-size: 12px;">提交时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `
    };

    // 5. 发送邮件，增加异常捕获
    console.log('📤 开始发送邮件...');
    await transporter.sendMail(mailOptions);
    console.log('✅ 邮件发送成功！');
    
    // 6. 成功返回
    res.json({ 
      success: true, 
      message: '留言提交成功！我们会尽快与您联系 😊' 
    });

  } catch (error) {
    // 全量捕获异常，绝对不会让服务崩溃
    console.error('❌ 接口处理失败，详细错误：', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器处理失败，请稍后重试！错误详情：' + error.message 
    });
  }
});

// 额外增加：健康检查接口，让Railway确认服务正常运行
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 启动服务器，增加启动异常捕获
try {
  app.listen(PORT, () => {
    console.log(`✅ 服务器已启动！`);
    console.log(`📱 监听端口：${PORT}`);
    console.log(`🌐 健康检查地址：http://localhost:${PORT}/health`);
  });
} catch (error) {
  console.error('❌ 服务器启动失败：', error);
}
