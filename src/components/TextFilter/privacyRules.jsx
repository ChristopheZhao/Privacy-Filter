export const systemRules = {
  idCard: {
    pattern: /(?:身份证号?[：:]\s*|(?<!\w))([1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx])(?!\w)/g,
    replacement: (match, id) => match.replace(id, '[ID_CARD]'),
    description: '身份证号码过滤',
  },
  phoneNumber: {
    pattern: /(?:联系电话|手机号?|电话)[：:]\s*(?:\+?86[-\s]*)?(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})|(?<!\d)(?:\+?86[-\s]*)?(1[3-9]\d{9})(?!\d)/g,
    replacement: (match, labelledNumber, standaloneNumber) =>
      match.replace(labelledNumber || standaloneNumber, '[PHONE_NUMBER]'),
    description: '手机号码过滤',
  },
  email: {
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replacement: '[EMAIL]',
    description: '电子邮箱过滤',
  },
  wechat: {
    pattern: /((?:微信(?:号)?|WeChat(?:\s*ID)?|wx)[：:]\s*)([\w-]{5,19})/gi,
    replacement: (match, prefix) => `${prefix}[WECHAT_ID]`,
    description: '微信号过滤',
  },
  qqNumber: {
    pattern: /((?:QQ|qq)(?:号)?[：:]\s*)([1-9][0-9]{4,})/g,
    replacement: (match, prefix) => `${prefix}[QQ_NUMBER]`,
    description: 'QQ 号过滤',
  },
  chineseName: {
    pattern: /((?:姓名|名字)[：:]\s*)([\u4e00-\u9fa5·]{2,20})|(?<![\u4e00-\u9fa5])([\u4e00-\u9fa5]{2,4})(?=(先生|女士|同学|老师))/g,
    replacement: (match, prefix, labelledName, standaloneName, suffix) => {
      if (prefix && labelledName) {
        return `${prefix}[NAME]`;
      }
      if (standaloneName && suffix) {
        return `[NAME]${suffix}`;
      }
      return match;
    },
    description: '中文姓名过滤',
  },
  address: {
    pattern: /((?:住址|地址|所在地|位于|住在)[：:]\s*)([^\n，。,；;]{6,})/g,
    replacement: (match, prefix) => `${prefix}[ADDRESS]`,
    description: '地址信息过滤',
  },
  bankCard: {
    pattern: /(?<!\d)(?:\d{4}[-\s]?){3,4}\d{1,4}(?!\d)/g,
    replacement: '[BANK_CARD]',
    description: '银行卡号过滤',
  },
  passport: {
    pattern: /(?<![A-Za-z0-9])(?:[EG]\d{8}|[A-Z]{1,2}\d{7,8}|[HMhm]\d{8,10})(?![A-Za-z0-9])/g,
    replacement: '[PASSPORT_NUMBER]',
    description: '护照号码过滤',
  },
  apiKeys: {
    pattern: /((?:[A-Z_]*(?:API[_]?KEY|TOKEN|SECRET|CREDENTIALS|AUTH)|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?)([A-Za-z0-9._-]{8,})(["']?)/g,
    replacement: (match, prefix, value, suffix) => `${prefix}[CREDENTIALS]${suffix}`,
    description: 'API 密钥过滤',
  },
  sensitiveAssignments: {
    pattern: /((?:"(?:api[_]?key|token|secret|auth|credentials)"\s*:\s*")([^"]+)("))/gi,
    replacement: (match, prefix, value, suffix) => {
      if (value.startsWith('pub_') || value.startsWith('pk_')) {
        return `${prefix}[PUBLIC_KEY]${suffix}`;
      }
      return `${prefix}[SENSITIVE_VALUE]${suffix}`;
    },
    description: '敏感键值对过滤',
  },
  databaseUrls: {
    pattern: /(?:mongodb(?:\+srv)?|mysql|postgresql|postgres|jdbc:postgresql|jdbc:mysql|jdbc:sqlserver|mssql|redis):\/\/[^"\s\n]+/gi,
    replacement: '[DATABASE_URL]',
    description: '数据库 URL 过滤',
  },
  databaseConfig: {
    pattern: /^(?:(?:DB|MYSQL|POSTGRES|POSTGRESQL|MSSQL|SQL|MONGODB|REDIS)_(?:HOST|USER|USERNAME|PASS(?:WORD)?|NAME|PORT|DATABASE|SCHEMA|URI|URL)|MONGO(?:DB)?_(?:URI|URL|HOST|USER|PASS|DB|PORT))=["']?([^"'\n]+)["']?$/gmi,
    replacement: (match) => {
      const key = match.split('=')[0];
      if (/PASS|PASSWORD/i.test(key)) {
        return `${key}=[SENSITIVE_VALUE]`;
      }
      return `${key}=[DATABASE_CONFIG]`;
    },
    description: '数据库配置过滤',
  },
  ipAddress: {
    pattern: /(?:"(?:host|ip|address|server|hostname)"\s*:\s*")((?:\d{1,3}\.){3}\d{1,3})(?::(\d+))?(?=")|(?<![\w.])((?:\d{1,3}\.){3}\d{1,3})(?::(\d+))?(?![\w.])/g,
    replacement: (match, configIP, configPort, standaloneIP, standalonePort) => {
      const ip = configIP || standaloneIP;
      const port = configPort || standalonePort;
      if (ip && port) {
        return match.replace(`${ip}:${port}`, '[IP_ADDRESS]:[PORT]');
      }
      if (ip) {
        return match.replace(ip, '[IP_ADDRESS]');
      }
      return match;
    },
    description: 'IP 地址和端口过滤',
  },
  urlIpAddress: {
    pattern: /((https?):\/\/)((?:\d{1,3}\.){3}\d{1,3})(?::(\d+))?([/\w\-.*?=&%#]*)/g,
    replacement: (match, prefix, protocol, ip, port, path) =>
      `${prefix}[IP_ADDRESS]${port ? ':[PORT]' : ''}${path || ''}`,
    description: 'URL 中的 IP 地址过滤',
  },
  specialIpConfig: {
    pattern: /((?:\/\/|@))((?:\d{1,3}\.){3}\d{1,3})(?::(\d+))?(?=\/|\?|$)/g,
    replacement: (match, prefix, ip, port) =>
      `${prefix}[IP_ADDRESS]${port ? ':[PORT]' : ''}`,
    description: '特殊格式 IP 配置过滤',
  },
  apiEndpoint: {
    pattern: /("endpoint"\s*:\s*")([^"]+)(")/g,
    replacement: (match, prefix, value, suffix) => `${prefix}[API_ENDPOINT]${suffix}`,
    description: 'API 端点过滤',
  },
  environmentVars: {
    pattern: /^(?:export\s+)?([A-Z_]+)(\s*=\s*)([^\s\n]+)$/gim,
    replacement: (match, variableName, equals, value) => {
      const sensitiveWords = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PASS', 'AUTH', 'CREDENTIAL'];
      if (sensitiveWords.some((word) => variableName.includes(word))) {
        return `${variableName}${equals}[SENSITIVE_VALUE]`;
      }
      if (/DB_|REDIS|MONGO/i.test(variableName)) {
        return `${variableName}${equals}[DATABASE_CONFIG]`;
      }
      return match;
    },
    description: '环境变量过滤',
  },
  configValues: {
    pattern: /^(?!\s*(?:export\s+)?(?:DB|MYSQL|POSTGRES|POSTGRESQL|MSSQL|SQL|MONGODB|REDIS|MONGO))(?:export\s+)?([A-Z_]+)(\s*=\s*)([^\s\n]+)$/gim,
    replacement: (match, key, equals) => {
      if (/(API[_]?KEY|TOKEN|SECRET|CREDENTIALS|AUTH)$/i.test(key)) {
        return match;
      }
      return `${key}${equals}[CONFIG_VALUE]`;
    },
    description: '配置值过滤',
  },
};

export const ruleOrder = [
  'idCard',
  'phoneNumber',
  'email',
  'wechat',
  'qqNumber',
  'chineseName',
  'address',
  'bankCard',
  'passport',
  'apiKeys',
  'sensitiveAssignments',
  'environmentVars',
  'configValues',
  'databaseUrls',
  'databaseConfig',
  'ipAddress',
  'specialIpConfig',
  'urlIpAddress',
  'apiEndpoint',
];

export const defaultActiveRules = ruleOrder.reduce((acc, rule) => {
  acc[rule] = true;
  return acc;
}, {});
