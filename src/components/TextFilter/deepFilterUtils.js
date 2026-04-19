export const formatConfidence = (confidence) =>
  `${Math.round(Number(confidence || 0) * 100)}%`;

export const formatElapsed = (elapsedMs) =>
  elapsedMs >= 1000 ? `${(elapsedMs / 1000).toFixed(1)} 秒` : `${elapsedMs} ms`;

export const getFindingKey = (finding) =>
  `${finding.label}:${finding.start}:${finding.end}:${finding.text}`;

export const buildSelectedFindingKeys = (findings) => {
  const nextSelection = {};
  (findings || []).forEach((finding) => {
    nextSelection[getFindingKey(finding)] = true;
  });
  return nextSelection;
};

export const getSelectedFindings = (findings, selectedFindingKeys) =>
  (findings || []).filter((finding) => selectedFindingKeys[getFindingKey(finding)]);

export const applyResolvedFindings = (text, findings) => {
  if (!text) {
    return '';
  }

  if (!Array.isArray(findings) || findings.length === 0) {
    return text;
  }

  const sortedFindings = findings
    .slice()
    .sort((left, right) => right.start - left.start);

  let output = text;
  sortedFindings.forEach((finding) => {
    output =
      output.slice(0, finding.start) +
      finding.replacement +
      output.slice(finding.end);
  });

  return output;
};
