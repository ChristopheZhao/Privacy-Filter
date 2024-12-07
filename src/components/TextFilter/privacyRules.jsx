// src/utils/privacyRules.js

export const systemRules = {
    // ===== 个人身份信息 =====
    idCard: {
        pattern: /(?:身份证号?[：:]\s*|^)?([1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx])/g,
        replacement: (match, id) => match.replace(id, '[ID_CARD]'),
        description: '身份证号码过滤'
    },
    phoneNumber: {
        pattern: /(?:联系电话|手机号码?|电话)[：:]\s*(?:\+?86\s*)?(?:([1-9]\d{10})|([1-9]\d{2}-\d{4}-\d{4}))/g,
        replacement: (match, fullNum, dashedNum) => {
            const num = fullNum || dashedNum;
            return match.replace(num, '[PHONE_NUMBER]');
        },
        description: '手机号码过滤'
    },
    email: {
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        replacement: '[EMAIL]',
        description: '电子邮箱过滤'
    },

    // ===== 社交账号 =====
    wechat: {
        pattern: /(?:微信(?:号)?|WeChat(?:\s*ID)?|wx)[：:]\s*([\w-]{5,19})/g,
        replacement: (match, id) => match.replace(id, '[WECHAT_ID]'),
        description: '微信号过滤'
    },
    qqNumber: {
        pattern: /(?:QQ|qq)(?:号)?[：:]\s*[1-9][0-9]{4,}|(?:^|\s)[1-9][0-9]{4,}(?:\s|$)/g,
        replacement: '[QQ_NUMBER]',
        description: 'QQ号过滤'
    },

    // ===== 个人基本信息 =====
    chineseName: {
        pattern: /(?:姓名|名字)[：:]\s*[\u4e00-\u9fa5]{2,4}|(?:^|\s)[\u4e00-\u9fa5]{2,4}(?=先生|女士|同学|老师)/g,
        replacement: '[NAME]',
        description: '中文姓名过滤'
    },
    address: {
        pattern: /((?:住址|地址|所在地|位于|住在)[：:]\s*|^(?:我)?(?:住在|在|位于))((?:[\u4e00-\u9fa5]{2,}(?:省|自治区|市|自治州|县|区|镇|街道|路|号|巷|弄))+)/g,
        replacement: (match, prefix, address) => `${prefix}[ADDRESS]`,
        description: '地址信息过滤'
      },

    // ===== 证件和金融信息 =====
    bankCard: {
        pattern: /(?:[0-9]{4}\s*){3,4}[0-9]{4}|[0-9]{13,19}/g,
        replacement: '[BANK_CARD]',
        description: '银行卡号过滤'
    },
    passport: {
        pattern: /(?:[A-Z]{1,2}[0-9]{6,10})|(?:[HMhm]\d{8})|(?:[0-9]{9})/g,
        replacement: '[PASSPORT_NUMBER]',
        description: '护照号码过滤'
    },

    // ===== API和密钥 =====
    apiKeys: {
        // 更新匹配模式，添加对单独 API_KEY 的处理
        pattern: /(?:(?:[A-Z_]+(?:API[_]?KEY|TOKEN|SECRET|CREDENTIALS|AUTH))\s*=\s*["']?([a-zA-Z0-9_\-\.]+(?:[-_][a-zA-Z0-9]+)+)["']?|(?:with\s+)?(?:API\s+key|token|secret)[：:]\s*([a-zA-Z0-9_\-\.]+(?:[-_][a-zA-Z0-9]+)+)|API_KEY\s*=\s*["']?([a-zA-Z0-9_\-\.]+(?:[-_][a-zA-Z0-9]+)+)["']?)/gi,
        replacement: (match, keyValue1, keyValue2, keyValue3) => {
            const key = keyValue1 || keyValue2 || keyValue3;
            return match.replace(key, '[CREDENTIALS]');
        },
        description: 'API密钥过滤'
    },
    // 敏感信息赋值处理（作为 API 密钥的补充）
    sensitiveAssignments: {
        pattern: /("(?:api[_]?key|token|secret|auth|credentials)"\s*:\s*)(["'])([^"']+)(["'])/gi,
        replacement: (match, prefix, quote1, value, quote2) => {
            // 如果是公开信息，保持原样
            if (value.startsWith('pub_') || value.startsWith('pk_')) {
                return `${prefix}${quote1}[PUBLIC_KEY]${quote2}`;
            }
            return `${prefix}${quote1}[SENSITIVE_VALUE]${quote2}`;
        },
        description: '敏感键值对过滤'
    },

    // ===== 数据库相关 =====
    databaseUrls: {
        pattern: /((?:mongodb(?:\+srv)?|mysql|postgresql|postgres|jdbc:postgresql|jdbc:mysql|jdbc:sqlserver|mssql|sqlserver):\/\/[^"\s\n]+)/gi,
        replacement: '[DATABASE_URL]',
        description: '数据库URL过滤'
      },
      databaseConfig: {
        pattern: /^(?:(?:DB|MYSQL|POSTGRES|POSTGRESQL|MSSQL|SQL|MONGODB)_(?:HOST|USER|PASS(?:WORD)?|NAME|PORT|DATABASE|SCHEMA)|(?:MONGO(?:DB)?_(?:URI|URL|HOST|USER|PASS|DB|PORT)))=["']?([^"'\n]+)["']?$/gmi,
        replacement: (match, value) => {
          const key = match.split('=')[0];
          if (key.includes('PASSWORD') || key.includes('PASS')) {
            return `${key}=[SENSITIVE_VALUE]`;
          }
          return `${key}=[DATABASE_CONFIG]`;
        },
        description: '数据库配置过滤'
      },


      // ===== IP和网络 =====
    ipAddress: {
        pattern: /(?:(?:"(?:host|ip|address|server|hostname)"\s*:\s*")((?:\d{1,3}\.){3}\d{1,3})(?::(\d+))?(?:")|(?<![\w])((?:\d{1,3}\.){3}\d{1,3})(?::(\d+))?(?![\w]))/g,
        replacement: (match, configIP, configPort, standaloneIP, standalonePort) => {
        const ip = configIP || standaloneIP;
        const port = configPort || standalonePort;
        if (configIP) {
            return port ? match.replace(`${ip}:${port}`, '[IP_ADDRESS]:[PORT]') : match.replace(ip, '[IP_ADDRESS]');
        }
        return port ? '[IP_ADDRESS]:[PORT]' : '[IP_ADDRESS]';
        },
        description: 'IP地址和端口过滤'
    },
    urlIpAddress: {
        pattern: /(?:https?:\/\/)((?:\d{1,3}\.){3}\d{1,3})(?::(\d+))?([\/\w\-.*?]*)/g,
        replacement: (match, ip, port, path) => {
        if (port) {
            return `http://[IP_ADDRESS]:[PORT]${path || ''}`;
        }
        return `http://[IP_ADDRESS]${path || ''}`;
        },
        description: 'URL中的IP地址过滤'
    },
    // ===== 特殊格式IP配置 =====
    specialIpConfig: {
        pattern: /(?:\/\/|@)((?:\d{1,3}\.){3}\d{1,3})(?::(\d+))?(?:\/|\?|$)/g,
        replacement: (match, ip, port) => {
            if (port) {
                return match.replace(`${ip}:${port}`, '[IP_ADDRESS]:[PORT]');
            }
            return match.replace(ip, '[IP_ADDRESS]');
        },
        description: '特殊格式IP配置过滤'
    },

    // ===== API端点 =====
    apiEndpoint: {
        pattern: /("endpoint"\s*:\s*)(["'])(https?:\/\/[^"']+)(["'])/g,
        replacement: (match, prefix, quote1, value, quote2) => `${prefix}${quote1}[API_ENDPOINT]${quote2}`,
        description: 'API端点过滤'
    },

    // ===== 环境和配置 =====
    environmentVars: {
        pattern: /(?:^|\s+)-\s*([A-Z_]+)(\s*=\s*)([^\s\n]+)(?=\s*$|\s+)/gm,
        replacement: (match, varName, equals, value) => {
          const sensitiveVars = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PASS', 'AUTH', 'CREDENTIAL'];
          if (sensitiveVars.some(sensitive => varName.includes(sensitive))) {
            return `- ${varName}${equals}[SENSITIVE_VALUE]`;
          }
          if (varName.includes('DB_') || varName.includes('REDIS') || varName.includes('MONGO')) {
            if (value.includes('://') || value.includes('password') || value.includes('user')) {
              return `- ${varName}${equals}[DATABASE_CONFIG]`;
            }
          }
          return match;
        },
        description: '环境变量过滤'
    },

    configValues: {
        pattern: /(?:^|\s+)([A-Z_]+)(\s*=\s*)([^\s\n]+)(?=\s*$|\s+)/gm,
        replacement: (match, key, equals, value) => {
            // 排除已经被其他规则处理的情况
            if (/(API[_]?KEY|TOKEN|SECRET|CREDENTIALS|AUTH)$/i.test(key)) {
                return match;  // 跳过 API 相关的配置
            }
            return `${key}${equals}[CONFIG_VALUE]`;
        },
        description: '配置值过滤'
    }
  };

  
  export const ruleOrder = [
    // 个人信息优先
    'idCard',
    'phoneNumber',
    'email',
    'wechat',
    'qqNumber',
    'chineseName',
    'address',
    'bankCard',
    'passport',
    // 系统配置信息
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
