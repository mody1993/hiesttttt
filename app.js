import 'dotenv/config';

process.env.SUPPRESS_NO_CONFIG_WARNING = 'true';

// =========================================================================
// 🧹 1. نظام تنظيف وفلترة سجلات الكونسول (Console Cleaner)
// =========================================================================
const originalLog = console.log.bind(console);
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

const HIDE_LOGS = [
  '[DEBUG]', '[WARN]', 'DEBUG', 'WARN', 'CleanUp', 'Synchronise',
  'GroupAudioCountUpdated', 'MessageUpdate', 'Websocket', 'TipAdd',
  'Message from self ignoring', 'Store Reset', 'apiKey will be required',
  'APIKey will be required', 'No configurations found', 'SUPPRESS_NO_CONFIG_WARNING',
  'Logged in [profile:', 'channel that was not cached', 'privateMessageSubscription',
  'channelMessageSubscription', 'tipChannelSubscription'
];

function shouldHide(text) {
  return HIDE_LOGS.some(word => text.includes(word));
}

console.log = (...args) => {
  const text = args.map(String).join(' ');
  if (shouldHide(text)) return;
  originalLog(...args);
};
console.info = console.log;
console.debug = console.log;

console.warn = (...args) => {
  const text = args.map(String).join(' ');
  if (shouldHide(text)) return;
  originalWarn(...args);
};

console.error = (...args) => {
  const text = args.map(String).join(' ');
  if (shouldHide(text)) return;
  originalError(...args);
};

const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, callback) => {
  const text = chunk?.toString?.() || '';
  if (shouldHide(text)) return true;
  return originalStdoutWrite(chunk, encoding, callback);
};

const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, encoding, callback) => {
  const text = chunk?.toString?.() || '';
  if (shouldHide(text)) return true;
  return originalStderrWrite(chunk, encoding, callback);
};

// =========================================================================
// 📦 2. المكتبات وإعدادات الحسابات الـ 12
// =========================================================================
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs.default || wolfjs;

const accounts = [
  { identity: process.env.U1_MAIL, secret: process.env.U1_PASS },
  { identity: process.env.U2_MAIL, secret: process.env.U2_PASS },
  { identity: process.env.U3_MAIL, secret: process.env.U3_PASS },
  { identity: process.env.U4_MAIL, secret: process.env.U4_PASS },
  { identity: process.env.U5_MAIL, secret: process.env.U5_PASS },
  { identity: process.env.U6_MAIL, secret: process.env.U6_PASS },
  { identity: process.env.U7_MAIL, secret: process.env.U7_PASS },
  { identity: process.env.U8_MAIL, secret: process.env.U8_PASS },
  { identity: process.env.U9_MAIL, secret: process.env.U9_PASS },
  { identity: process.env.U10_MAIL, secret: process.env.U10_PASS },
  { identity: process.env.U11_MAIL, secret: process.env.U11_PASS },
  { identity: process.env.U12_MAIL, secret: process.env.U12_PASS }
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// =========================================================================
// 🔥 3. استخراج Room ID ودوال التعامل الآمن مع المكتبة
// =========================================================================
function extractRoomId(text = "") {
  if (!text) return null;
  const cleaned = text.replace(/[\u200B-\u200F\uFEFF]/g, '');
  const match = cleaned.match(/ID\s*(\d{5,})|\((\d{5,})\)|(\d{5,})/i);
  const id = match?.[1] || match?.[2] || match?.[3];
  return id ? parseInt(id, 10) : null;
}

// دالة الانضمام الآمنة
async function joinGroupSafe(service, roomId) {
  if (typeof service.groups?.join === 'function') {
    return await service.groups.join(roomId);
  } else if (typeof service.group?.join === 'function') {
    return await service.group.join(roomId);
  } else if (typeof service.joinGroup === 'function') {
    return await service.joinGroup(roomId);
  }
}

// دالة الإرسال الآمنة
async function sendMessageSafe(service, roomId, text) {
  if (typeof service.messaging?.sendGroupMessage === 'function') {
    return await service.messaging.sendGroupMessage(roomId, text);
  } else if (typeof service.messaging?.sendChannelMessage === 'function') {
    return await service.messaging.sendChannelMessage(roomId, text);
  } else if (typeof service.messaging?.sendMessage === 'function') {
    return await service.messaging.sendMessage(roomId, text);
  } else if (typeof service.sendGroupMessage === 'function') {
    return await service.sendGroupMessage(roomId, text);
  } else {
    throw new Error('لم يتم العثور على دالة إرسال متوافقة في المكتبة');
  }
}

// =========================================================================
// 🤖 4. تشغيل الحسابات الـ 12 بشكل مستقل
// =========================================================================
accounts.forEach((acc, index) => {

  const service = new WOLF();

  // 📦 طابور + Set لكل حساب
  let queue = [];
  let queueSet = new Set(); // منع التكرار
  let isProcessing = false;

  const DELAY = 3000; // تقليل المهلة إلى 3 ثوانٍ لسرعة التنفيذ

  // =====================
  // 📥 إضافة للروم (بدون تكرار + أولوية جديدة)
  // =====================
  function addToQueue(roomId) {
    if (!roomId) return;

    if (queueSet.has(roomId)) return;

    queueSet.add(roomId);

    // 🔥 أولوية للرومات الجديدة (تدخل أول الطابور)
    queue.unshift(roomId);
  }

  // =====================
  // 🔁 تنفيذ الطابور
  // =====================
  async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;

    while (queue.length > 0) {

      const roomId = queue.shift();
      queueSet.delete(roomId);

      try {
        // انضمام آمن
        await joinGroupSafe(service, roomId).catch(() => {});

        // مهلة بسيطة لضمان الجاهزية بالسيرفر
        await sleep(500);

        // إرسال آمن
        await sendMessageSafe(service, roomId, "!اسرق 5");

        console.log(`🚀 [${index + 1}] تم الإرسال بنجاح إلى الروم: ${roomId}`);

      } catch (err) {
        console.log(`❌ [${index + 1}] خطأ في الروم (${roomId}):`, err.message || err);
      }

      await sleep(DELAY);
    }

    isProcessing = false;
  }

  // =====================
  // 📩 استقبال الرسائل
  // =====================
  service.on('message', async (message) => {
    if (message.isGroup) return;

    const content =
      message.body ||
      message.content ||
      message.text ||
      message.message ||
      "";

    const isBonus =
      content.includes("Bonus-Heist") ||
      content.includes("معزز") ||
      content.includes("Heist") ||
      content.includes("معزز إضافي");

    if (!isBonus) return;

    const roomId = extractRoomId(content);
    if (!roomId) return;

    console.log(`📥 [${index + 1}] استلم الروم: ${roomId}`);

    addToQueue(roomId);

    processQueue();
  });

  service.on('ready', () => {
    console.log(`✅ الحساب [${index + 1}] جاهز ومتصل`);
  });

  service.login(acc.identity, acc.secret);
});
