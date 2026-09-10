import 'dotenv/config';
import wolfjs from 'wolf.js';

const { WOLF } = wolfjs.default || wolfjs;

process.env.SUPPRESS_NO_CONFIG_WARNING = 'true';

// =========================================================================
// 🧹 1. فلترة سجلات الكونسول
// =========================================================================
const originalLog = console.log.bind(console);
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

const HIDE_LOGS = [
  '[DEBUG]', 'Synchronise', 'Websocket', 'tipChannelSubscription',
  'No configurations found', 'SUPPRESS_NO_CONFIG_WARNING',
  'apiKey will be required'
];

function shouldHide(text) {
  return HIDE_LOGS.some(word => text.includes(word));
}

console.log = (...args) => {
  const text = args.map(String).join(' ');
  if (!shouldHide(text)) originalLog(...args);
};
console.warn = (...args) => {
  const text = args.map(String).join(' ');
  if (!shouldHide(text)) originalWarn(...args);
};
console.error = (...args) => {
  const text = args.map(String).join(' ');
  if (!shouldHide(text)) originalError(...args);
};

// =========================================================================
// 📦 2. مصفوفة الحسابات الـ 14
// =========================================================================
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
  { identity: process.env.U_MAIL_12, secret: process.env.U_PASS_12 },
  { identity: process.env.U_MAIL_13, secret: process.env.U_PASS_13 },
  { identity: process.env.U_MAIL_14, secret: process.env.U_PASS_14 }
];

const sleep = (ms) => {
  const duration = Number.isFinite(Number(ms)) && Number(ms) >= 0 ? Number(ms) : 1000;
  return new Promise(r => setTimeout(r, duration));
};

function extractRoomId(text = "") {
  if (!text) return null;
  const cleaned = text.replace(/[\u200B-\u200F\uFEFF]/g, '');

  const roomPatternMatch = cleaned.match(/\[[^\]]+\]\s*\(\s*(?:ID\s*)?(\d+)\s*\)/i);
  if (roomPatternMatch) return parseInt(roomPatternMatch[1], 10);

  const parenthesesMatch = cleaned.match(/\((?:ID\s*)?(\d{3,8})\)/i);
  if (parenthesesMatch) return parseInt(parenthesesMatch[1], 10);

  const wolfTagMatch = cleaned.match(/\[group\s*id\s*=\s*(\d+)\]/i) || cleaned.match(/(?:id=|id\s*=\s*)(\d+)/i);
  if (wolfTagMatch) return parseInt(wolfTagMatch[1], 10);

  const fallbackMatch = cleaned.match(/\b(\d{3,8})\b/);
  return fallbackMatch ? parseInt(fallbackMatch[1], 10) : null;
}

async function joinGroupSafe(service, roomId) {
  if (typeof service.group?.join === 'function') return await service.group.join(roomId);
  if (typeof service.groups?.join === 'function') return await service.groups.join(roomId);
  if (typeof service.joinGroup === 'function') return await service.joinGroup(roomId);
}

async function sendMessageSafe(service, roomId, text) {
  if (typeof service.messaging?.sendGroupMessage === 'function') {
    return await service.messaging.sendGroupMessage(roomId, text);
  }
  if (typeof service.messaging?.sendMessage === 'function') {
    return await service.messaging.sendMessage(roomId, text);
  }
  if (typeof service.sendGroupMessage === 'function') {
    return await service.sendGroupMessage(roomId, text);
  }
}

// =========================================================================
// 🤖 3. تشغيل الحسابات مع التقاط أخطاء المكتبة
// =========================================================================
async function initBots() {
  for (let index = 0; index < accounts.length; index++) {
    const acc = accounts[index];

    // التحقق الدقيق من سلامة النص
    const isInvalid = !acc.identity || !acc.secret || acc.identity.trim() === '' || acc.identity === 'undefined';
    if (isInvalid) {
      console.warn(`⚠️ [حساب ${index + 1}] مفقود أو غير معرف في GitHub Secrets.`);
      continue;
    }

    const service = new WOLF();

    let queue = [];
    let queueSet = new Set();
    let isProcessing = false;

    function addToQueue(roomId) {
      if (!roomId || queueSet.has(roomId)) return;
      queueSet.add(roomId);
      queue.unshift(roomId);
    }

    async function processQueue() {
      if (isProcessing) return;
      isProcessing = true;

      while (queue.length > 0) {
        const roomId = queue.shift();
        queueSet.delete(roomId);

        try {
          await joinGroupSafe(service, roomId).catch(() => {});
          await sleep(1500);

          await sendMessageSafe(service, roomId, "!صيد 3");
          console.log(`🚀 [حساب ${index + 1}] تم الإرسال بنجاح إلى الروم: ${roomId}`);
        } catch (err) {
          console.error(`❌ [حساب ${index + 1}] خطأ في الروم (${roomId}):`, err.message || err);
        }

        await sleep(3000);
      }

      isProcessing = false;
    }

    const handleMessage = async (message) => {
      if (message.isGroup) return;

      const content = message.body || message.content || message.text || "";
      const isBonus = /Bonus-Cast|معزز|Cast|معزز إضافي/i.test(content);
      if (!isBonus) return;

      const roomId = extractRoomId(content);
      if (!roomId) return;

      console.log(`📥 [حساب ${index + 1}] استلم الروم: ${roomId}`);
      addToQueue(roomId);
      processQueue();
    };

    // التقاط أخطاء تسجيل الدخول والشبكة لمنع حلقة NaN الداخلي للمكتبة
    service.on('loginFailed', (err) => {
      console.error(`❌ [حساب ${index + 1}] فشل تسجيل الدخول:`, err?.message || err);
    });

    service.on('error', (err) => {
      console.error(`❌ [حساب ${index + 1}] خطأ اتصال في المكتبة:`, err?.message || err);
    });

    service.on('message', handleMessage);
    service.on('privateMessage', handleMessage);

    service.on('ready', () => {
      console.log(`✅ الحساب [${index + 1}] جاهز ومتصل`);
    });

    try {
      service.login(acc.identity, acc.secret);
    } catch (e) {
      console.error(`❌ [حساب ${index + 1}] متعذر البدء:`, e.message);
    }

    await sleep(1500); // مهلة بين الاتصالات لتفادي Rate Limit
  }
}

initBots();

setInterval(() => {}, 60000);
