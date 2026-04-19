import { ruleOrder, systemRules } from '../../../src/components/TextFilter/privacyRules.js';

const SENSITIVE_ENV_WORDS = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PASS', 'AUTH', 'CREDENTIAL'];

const clonePattern = (pattern) =>
  new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);

const createSpan = ({ label, start, end, text, replacement, confidence = 1, source = 'regex', ruleKey }) => ({
  label,
  start,
  end,
  text,
  replacement,
  confidence,
  source,
  ruleKey,
});

const findWithOffset = (haystack, needle, offset = 0) => haystack.indexOf(needle, Math.max(0, offset));

const pushSubmatchSpan = (spans, match, subgroup, options = {}) => {
  if (!subgroup) {
    return;
  }

  const relativeIndex = findWithOffset(match[0], subgroup, options.offset ?? 0);
  if (relativeIndex === -1) {
    return;
  }

  spans.push(
    createSpan({
      ...options,
      start: match.index + relativeIndex,
      end: match.index + relativeIndex + subgroup.length,
      text: subgroup,
    })
  );
};

const extractIpAndPort = (spans, match, ip, port, options = {}) => {
  if (ip) {
    pushSubmatchSpan(spans, match, ip, {
      ...options,
      label: 'IP_ADDRESS',
      replacement: '[IP_ADDRESS]',
    });
  }

  if (ip && port) {
    const ipOffset = findWithOffset(match[0], ip);
    const portOffset = findWithOffset(match[0], port, ipOffset + ip.length);
    if (portOffset !== -1) {
      spans.push(
        createSpan({
          label: 'PORT',
          start: match.index + portOffset,
          end: match.index + portOffset + port.length,
          text: port,
          replacement: '[PORT]',
          confidence: 1,
          source: 'regex',
          ruleKey: options.ruleKey,
        })
      );
    }
  }
};

const extractRuleMatches = (ruleKey, text) => {
  const rule = systemRules[ruleKey];
  if (!rule?.pattern) {
    return [];
  }

  const pattern = clonePattern(rule.pattern);
  const spans = [];

  for (const match of text.matchAll(pattern)) {
    switch (ruleKey) {
      case 'idCard':
        pushSubmatchSpan(spans, match, match[1] ?? match[0], {
          label: 'ID_CARD',
          replacement: '[ID_CARD]',
          ruleKey,
        });
        break;
      case 'phoneNumber':
        pushSubmatchSpan(spans, match, match[1] ?? match[2], {
          label: 'PHONE_NUMBER',
          replacement: '[PHONE_NUMBER]',
          ruleKey,
        });
        break;
      case 'email':
        pushSubmatchSpan(spans, match, match[0], {
          label: 'EMAIL',
          replacement: '[EMAIL]',
          ruleKey,
        });
        break;
      case 'wechat':
        pushSubmatchSpan(spans, match, match[2], {
          label: 'WECHAT_ID',
          replacement: '[WECHAT_ID]',
          ruleKey,
          offset: match[1]?.length ?? 0,
        });
        break;
      case 'qqNumber':
        pushSubmatchSpan(spans, match, match[2], {
          label: 'QQ_NUMBER',
          replacement: '[QQ_NUMBER]',
          ruleKey,
          offset: match[1]?.length ?? 0,
        });
        break;
      case 'chineseName':
        pushSubmatchSpan(spans, match, match[2] ?? match[3], {
          label: 'NAME',
          replacement: '[NAME]',
          ruleKey,
          offset: match[1]?.length ?? 0,
        });
        break;
      case 'address':
        pushSubmatchSpan(spans, match, match[2], {
          label: 'ADDRESS',
          replacement: '[ADDRESS]',
          ruleKey,
          offset: match[1]?.length ?? 0,
        });
        break;
      case 'bankCard':
        pushSubmatchSpan(spans, match, match[0], {
          label: 'BANK_CARD',
          replacement: '[BANK_CARD]',
          ruleKey,
        });
        break;
      case 'passport':
        pushSubmatchSpan(spans, match, match[0], {
          label: 'PASSPORT_NUMBER',
          replacement: '[PASSPORT_NUMBER]',
          ruleKey,
        });
        break;
      case 'apiKeys':
        pushSubmatchSpan(spans, match, match[2], {
          label: 'SENSITIVE_VALUE',
          replacement: '[SENSITIVE_VALUE]',
          ruleKey,
          offset: match[1]?.length ?? 0,
        });
        break;
      case 'sensitiveAssignments':
        pushSubmatchSpan(spans, match, match[2], {
          label: match[2]?.startsWith('pub_') || match[2]?.startsWith('pk_') ? 'PUBLIC_KEY' : 'SENSITIVE_VALUE',
          replacement:
            match[2]?.startsWith('pub_') || match[2]?.startsWith('pk_')
              ? '[PUBLIC_KEY]'
              : '[SENSITIVE_VALUE]',
          ruleKey,
          offset: match[1]?.length ?? 0,
        });
        break;
      case 'databaseUrls':
        pushSubmatchSpan(spans, match, match[0], {
          label: 'DATABASE_URL',
          replacement: '[DATABASE_URL]',
          ruleKey,
        });
        break;
      case 'databaseConfig': {
        const key = match[0].split('=')[0] ?? '';
        pushSubmatchSpan(spans, match, match[1], {
          label: /PASS|PASSWORD/i.test(key) ? 'SENSITIVE_VALUE' : 'DATABASE_CONFIG',
          replacement: /PASS|PASSWORD/i.test(key) ? '[SENSITIVE_VALUE]' : '[DATABASE_CONFIG]',
          ruleKey,
        });
        break;
      }
      case 'ipAddress':
        extractIpAndPort(spans, match, match[1] ?? match[3], match[2] ?? match[4], { ruleKey });
        break;
      case 'urlIpAddress':
        extractIpAndPort(spans, match, match[3], match[4], { ruleKey });
        break;
      case 'specialIpConfig':
        extractIpAndPort(spans, match, match[2], match[3], { ruleKey });
        break;
      case 'apiEndpoint':
        pushSubmatchSpan(spans, match, match[2], {
          label: 'API_ENDPOINT',
          replacement: '[API_ENDPOINT]',
          ruleKey,
          offset: match[1]?.length ?? 0,
        });
        break;
      case 'environmentVars': {
        const variableName = match[1] ?? '';
        const value = match[3];
        if (!value) {
          break;
        }

        if (SENSITIVE_ENV_WORDS.some((word) => variableName.includes(word))) {
          pushSubmatchSpan(spans, match, value, {
            label: 'SENSITIVE_VALUE',
            replacement: '[SENSITIVE_VALUE]',
            ruleKey,
          });
        } else if (/DB_|REDIS|MONGO/i.test(variableName)) {
          pushSubmatchSpan(spans, match, value, {
            label: 'DATABASE_CONFIG',
            replacement: '[DATABASE_CONFIG]',
            ruleKey,
          });
        }
        break;
      }
      case 'configValues': {
        const key = match[1] ?? '';
        const value = match[3];
        if (!value || /(API[_]?KEY|TOKEN|SECRET|CREDENTIALS|AUTH)$/i.test(key)) {
          break;
        }
        pushSubmatchSpan(spans, match, value, {
          label: 'CONFIG_VALUE',
          replacement: '[CONFIG_VALUE]',
          ruleKey,
        });
        break;
      }
      default:
        break;
    }
  }

  return spans;
};

const dedupeSpans = (spans) => {
  const seen = new Set();
  return spans.filter((span) => {
    const key = `${span.label}:${span.start}:${span.end}:${span.text}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const extractRegexFindings = (text) =>
  dedupeSpans(ruleOrder.flatMap((ruleKey) => extractRuleMatches(ruleKey, text)));
