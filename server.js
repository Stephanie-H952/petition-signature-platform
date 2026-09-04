const express = require("express");
const path = require("path");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- 配置 AWS ----------
const REGION = process.env.AWS_REGION || "us-east-2";
const DYNAMO_TABLE = process.env.DYNAMO_TABLE;
const S3_BUCKET = process.env.S3_BUCKET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

AWS.config.update({ region: REGION });

const dynamo = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// ---------- 中间件 ----------
app.use(express.static(path.join(__dirname)));
app.use(express.json());

function requireEnv(res, names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) {
    return res.status(503).json({ error: `Missing server configuration: ${missing.join(", ")}` });
  }
  return null;
}

// ---------- 用户提交签名 ----------
app.post("/api/sign", async (req, res) => {
  try {
    const configError = requireEnv(res, ["DYNAMO_TABLE", "S3_BUCKET"]);
    if (configError) return;

    const { name, email, message, imageData } = req.body;
    if (!name || !email || !imageData) return res.status(400).json({ error: "Missing fields" });

    // 上传 PNG 到 S3
    const base64Data = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const imageKey = `${uuidv4()}.png`;
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: imageKey,
      Body: base64Data,
      ContentType: "image/png",
    }).promise();

    const s3Key = imageKey;

    // 写入 DynamoDB
    await dynamo.put({
      TableName: DYNAMO_TABLE,
      Item: { name, email, message, s3Key, timestamp: new Date().toISOString() },
    }).promise();

    res.json({ message: "Success", s3Key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit signature" });
  }
});

// ---------- 获取总签名人数 ----------
app.get("/api/count", async (req, res) => {
  try {
    const configError = requireEnv(res, ["DYNAMO_TABLE"]);
    if (configError) return;

    const data = await dynamo.scan({ TableName: DYNAMO_TABLE, Select: "COUNT" }).promise();
    res.json({ count: data.Count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get count" });
  }
});

// ---------- 管理员验证 ----------
function checkAdmin(req, res, next) {
  const configError = requireEnv(res, ["ADMIN_PASSWORD"]);
  if (configError) return;

  const pwd = req.headers["x-admin-password"];
  if (pwd !== ADMIN_PASSWORD) return res.status(403).json({ error: "Unauthorized" });
  next();
}

// ---------- 管理员获取所有签名 ----------
app.get("/api/admin/signs", checkAdmin, async (req, res) => {
  try {
    const configError = requireEnv(res, ["DYNAMO_TABLE"]);
    if (configError) return;

    const data = await dynamo.scan({ TableName: DYNAMO_TABLE }).promise();
    res.json({ signs: data.Items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load signs" });
  }
});

// ---------- 管理员删除签名 ----------
app.delete("/api/admin/signs", checkAdmin, async (req, res) => {
  try {
    const configError = requireEnv(res, ["DYNAMO_TABLE", "S3_BUCKET"]);
    if (configError) return;

    const { name, email } = req.body;
    const getRes = await dynamo.get({ TableName: DYNAMO_TABLE, Key: { name, email } }).promise();
    if (!getRes.Item) return res.status(404).json({ error: "Record not found" });

    const imageKey = getRes.Item.s3Key;
    await s3.deleteObject({ Bucket: S3_BUCKET, Key: imageKey }).promise();
    await dynamo.delete({ TableName: DYNAMO_TABLE, Key: { name, email } }).promise();

    res.json({ message: "Record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

const ExcelJS = require('exceljs');

app.get('/api/admin/export', checkAdmin, async (req, res) => {
  try {
    const configError = requireEnv(res, ["DYNAMO_TABLE", "S3_BUCKET"]);
    if (configError) return;

    const data = await dynamo.scan({ TableName: DYNAMO_TABLE }).promise();
    const signs = data.Items;
  

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Signatures");

  sheet.columns = [
    { header: "Name", key: "name", width: 20 },
    { header: "Email", key: "email", width: 25 },
    { header: "Message", key: "message", width: 30 },
    { header: "Signature", key: "signature", width: 40 },
    { header: "Timestamp", key: "timestamp", width: 25 }
  ];

  for (let i = 0; i < signs.length; i++) {
    const s = signs[i];
    const rowNumber = i + 2;

    sheet.addRow({
      name: s.name,
      email: s.email,
      message: s.message || "",
      signature: "",
      timestamp: s.timestamp
    });

    // 后端 fetch S3 图片
    const obj = await s3.getObject({ Bucket: S3_BUCKET, Key: s.s3Key }).promise();
    const imageId = workbook.addImage({ buffer: obj.Body, extension: 'png' });

    sheet.addImage(imageId, {
      tl: { col: 3, row: rowNumber-1 },
      ext: { width: 150, height: 45 }
    });
    sheet.getRow(rowNumber).height(50)
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=signatures.xlsx');

  await workbook.xlsx.write(res);
  res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load signs" });
  }
});


// ---------- 健康检查 ----------
app.get("/health", (req, res) => res.json({ ok: true }));

// ---------- 启动服务 ----------
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
