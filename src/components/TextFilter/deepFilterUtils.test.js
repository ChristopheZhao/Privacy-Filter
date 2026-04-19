import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyResolvedFindings,
  buildSelectedFindingKeys,
  getSelectedFindings,
} from './deepFilterUtils.js';

test('buildSelectedFindingKeys selects every finding by default', () => {
  const findings = [
    { label: 'NAME', start: 2, end: 4, text: '林朔' },
    { label: 'API_ENDPOINT', start: 5, end: 12, text: 'http://x' },
  ];

  const selected = buildSelectedFindingKeys(findings);

  assert.equal(Object.keys(selected).length, 2);
  assert.deepEqual(Object.values(selected), [true, true]);
});

test('getSelectedFindings returns only currently enabled findings', () => {
  const findings = [
    { label: 'ORG_NAME', start: 0, end: 6, text: '京东云企业服务部' },
    { label: 'NAME', start: 7, end: 9, text: '林朔' },
  ];
  const selected = buildSelectedFindingKeys(findings);
  selected['ORG_NAME:0:6:京东云企业服务部'] = false;

  const filtered = getSelectedFindings(findings, selected);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].label, 'NAME');
});

test('applyResolvedFindings produces correct preview with Chinese text', () => {
  const input =
    '群里结论是由京东云企业服务部的林朔继续跟，先把回调切到http://10.90.4.8:8088/hook，再用微信linshuo_dev确认；文档里的 https://example.internal:9443/callback 和 YOUR_TOKEN_HERE 只是占位。';
  const orgText = '京东云企业服务部';
  const nameText = '林朔';
  const endpointText = 'http://10.90.4.8:8088/hook';
  const wechatText = 'linshuo_dev';
  const findings = [
    {
      label: 'ORG_NAME',
      start: input.indexOf(orgText),
      end: input.indexOf(orgText) + orgText.length,
      text: orgText,
      replacement: '[ORG_NAME]',
    },
    {
      label: 'NAME',
      start: input.indexOf(nameText),
      end: input.indexOf(nameText) + nameText.length,
      text: nameText,
      replacement: '[NAME]',
    },
    {
      label: 'API_ENDPOINT',
      start: input.indexOf(endpointText),
      end: input.indexOf(endpointText) + endpointText.length,
      text: endpointText,
      replacement: '[API_ENDPOINT]',
    },
    {
      label: 'WECHAT_ID',
      start: input.indexOf(wechatText),
      end: input.indexOf(wechatText) + wechatText.length,
      text: wechatText,
      replacement: '[WECHAT_ID]',
    },
  ];

  const output = applyResolvedFindings(input, findings);

  assert.equal(
    output,
    '群里结论是由[ORG_NAME]的[NAME]继续跟，先把回调切到[API_ENDPOINT]，再用微信[WECHAT_ID]确认；文档里的 https://example.internal:9443/callback 和 YOUR_TOKEN_HERE 只是占位。'
  );
});

test('applyResolvedFindings preserves deselected spans in preview', () => {
  const input = '联系人林朔，微信linshuo_dev。';
  const findings = [
    {
      label: 'NAME',
      start: input.indexOf('林朔'),
      end: input.indexOf('林朔') + '林朔'.length,
      text: '林朔',
      replacement: '[NAME]',
    },
    {
      label: 'WECHAT_ID',
      start: input.indexOf('linshuo_dev'),
      end: input.indexOf('linshuo_dev') + 'linshuo_dev'.length,
      text: 'linshuo_dev',
      replacement: '[WECHAT_ID]',
    },
  ];
  const selected = buildSelectedFindingKeys(findings);
  selected['NAME:3:5:林朔'] = false;

  const preview = applyResolvedFindings(input, getSelectedFindings(findings, selected));

  assert.equal(preview, '联系人林朔，微信[WECHAT_ID]。');
});
