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
// 📦 2. المكتبات وإعدادات الحسابات الـ 12 (متطابقة مع GitHub Secrets)
// =========================================================================
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs.default || wolfjs;

const accounts = [
  { identity: process.env.U_MAIL_1, secret: process.env.U_PASS_1 },
  { identity: process.env.U_MAIL_2, secret: process.env.U_PASS_2 },
  { identity: process.env.U_MAIL_3, secret: process.env.U_PASS_3 },
  { identity: process.env.U_MAIL_4, secret: process.env.U_PASS_4 },
  { identity: process.env.U_MAIL_5, secret: process.env.U_PASS_5 },
  { identity: process.env.U_MAIL_6, secret: process.env.U_PASS_6 },
  { identity: process.env.U_MAIL_7, secret: process.env.U_PASS_7 },
  { identity: process.env.U_MAIL_8, secret: process.env.U_PASS_8 },
  { identity: process.env.U_MAIL_9, secret: process.env.U_PASS_9 },
  { identity: process.env.U_MAIL_10, secret: process.env.U_PASS_10 },
  { identity: process.env.U_MAIL_11, secret: process.env.U_PASS_11 },
  { identity: process.env.U_MAIL_12, secret: process.env.U_PASS_12 }
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// =========================================================================
// 🔥 3. استخراج Room ID ودوال التعامل الآمن (دقيقة لمنع رقم المستخدم)
// =========================================================================
function extractRoomId(text = "") {
  if (!text) return null;

  // 1. تنظيف النص من الأحرف والرموز الخفية
  const cleaned = text.replace(/[\u200B-\u200F\uFEFF]/g, '');

  // 2. النمط الأدق: اسم الروم بين أقواس مربعة يليه مباشرة رقم الروم مع (ID) أو بدونها
  // يطابق: [اسم الروم] (1234) أو [اسم الروم] (ID 123456)
  const roomPatternMatch = cleaned.match(/\[[^\]]+\]\s*\(\s*(?:ID\s*)?(\d+)\s*\)/i);
  if (roomPatternMatch) return parseInt(roomPatternMatch[1], 10);

  // 3. البحث بعد الكلمات المفتاحية للرومات (القناة/قناة/مجموعة/channel)
  const channelMatch = cleaned.match(/(?:القناة|قناة|مجموعة|مجموعه|group|channel)[^()]*\((\d+)\)/i);
  if (channelMatch) return parseInt(channelMatch[1], 10);

  // 4. فحص تاجات WOLF الرسمية أو روابط wolf://
  const wolfTagMatch = cleaned.match(/\[group\s*id\s*=\s*(\d+)\]/i) || 
                       cleaned.match(/wolf:\/\/group\?id=(\d+)/i);
  if (wolfTagMatch) return parseInt(wolfTagMatch[1], 10);

  // 5. خيار احتياطي: قص الرسالة قبل كلمة الشكر (thanks / الشكر) وأخذ الرقم الأول فقط
  const textBeforeThanks = cleaned.split(/(?:thanks|الشكر|شكر)/i)[0];
  const fallbackMatch = textBeforeThanks.match(/(?:ID\s*)?(\d{3,8})/i);
  
  return fallbackMatch ? parseInt(fallbackMatch[1], 10) : null;
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
  if (!acc.identity || !acc.secret) return; // يتخطى أي حساب غير معرّف

  const service = new WOLF();

  // 📦 طابور + Set لكل حساب
  let queue = [];
  let queueSet = new Set();
  let isProcessing = false;

  const DELAY = 3000;

  // =====================
  // 📥 إضافة للروم (بدون تكرار + أولوية جديدة)
  // =====================
  function addToQueue(roomId) {
    if (!roomId) return;
    if (queueSet.has(roomId)) return;

    queueSet.add(roomId);
    queue.unshift(roomId); // أولوية للرومات الجديدة
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
        await joinGroupSafe(service, roomId).catch(() => {});
        await sleep(500);

        await sendMessageSafe(service, roomId, "!صيد 3");
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
      content.includes("Bonus-Cast") ||
      content.includes("معزز") ||
      content.includes("Cast") ||
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
