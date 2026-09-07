export type ReferenceFoodExternalIdParts = {
  source: string;
  sourceFoodId: string;
  sourceVersion: string;
};

export function buildReferenceFoodExternalId({
  source,
  sourceFoodId,
  sourceVersion
}: ReferenceFoodExternalIdParts) {
  return `${source}:${sourceVersion}:${sourceFoodId}`;
}

export function parseReferenceFoodExternalId(
  value: string,
  expectedSource: string
): Omit<ReferenceFoodExternalIdParts, "source"> | null {
  const prefix = `${expectedSource}:`;

  if (!value.startsWith(prefix)) {
    return null;
  }

  const rest = value.slice(prefix.length);
  const separatorIndex = rest.lastIndexOf(":");

  if (separatorIndex <= 0 || separatorIndex === rest.length - 1) {
    return null;
  }

  return {
    sourceVersion: rest.slice(0, separatorIndex),
    sourceFoodId: rest.slice(separatorIndex + 1)
  };
}
