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
// 📦 2. مصفوفة توكنات الحسابات الـ 12
// =========================================================================
const accounts = [
  { token: process.env.U_TOKEN_1 },
  { token: process.env.U_TOKEN_2 },
  { token: process.env.U_TOKEN_3 },
  { token: process.env.U_TOKEN_4 },
  { token: process.env.U_TOKEN_5 },
  { token: process.env.U_TOKEN_6 },
  { token: process.env.U_TOKEN_7 },
  { token: process.env.U_TOKEN_8 },
  { token: process.env.U_TOKEN_9 },
  { token: process.env.U_TOKEN_10 },
  { token: process.env.U_TOKEN_11 },
  { token: process.env.U_TOKEN_12 }
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
// 🤖 3. تشغيل الحسابات عبر Session Tokens
// =========================================================================
async function initBots() {
  for (let index = 0; index < accounts.length; index++) {
    const acc = accounts[index];

    // التحقق من وجود التوكن الخص بالحساب
    const isInvalid = !acc.token || acc.token.trim() === '' || acc.token === 'undefined';
    if (isInvalid) {
      console.warn(`⚠️ [حساب ${index + 1}] التوكن غير موجود في GitHub Secrets (U_TOKEN_${index + 1}).`);
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

          await sendMessageSafe(service, roomId, "!صياد 3");
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
      const isBonus = /Bonus-Hunt|معزز|Hunt|معزز إضافي/i.test(content);
      if (!isBonus) return;

      const roomId = extractRoomId(content);
      if (!roomId) return;

      console.log(`📥 [حساب ${index + 1}] استلم الروم: ${roomId}`);
      addToQueue(roomId);
      processQueue();
    };

    service.on('loginFailed', (err) => {
      console.error(`❌ [حساب ${index + 1}] فشل التوثيق بالتوكن:`, err?.message || err);
    });

    service.on('error', (err) => {
      console.error(`❌ [حساب ${index + 1}] خطأ اتصال في المكتبة:`, err?.message || err);
    });

    service.on('message', handleMessage);
    service.on('privateMessage', handleMessage);

    service.on('ready', () => {
      console.log(`✅ الحساب [${index + 1}] متصل وجاهز عبر التوكن`);
    });

    try {
      service.login(acc.token);
    } catch (e) {
      console.error(`❌ [حساب ${index + 1}] متعذر البدء:`, e.message);
    }

    await sleep(2000); // مهلة زمنية بين الحسابات لمنع حظر الطلبات
  }
}

initBots();

setInterval(() => {}, 60000);
