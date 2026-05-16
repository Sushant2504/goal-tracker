export function computeScore(
  uomType: string,
  target: string,
  actualValue: string | null
): number | null {
  if (!actualValue) return null;

  switch (uomType) {
    case "MIN_NUMERIC":
    case "MIN_PERCENT": {
      const t = parseFloat(target);
      const a = parseFloat(actualValue);
      if (isNaN(t) || isNaN(a) || t === 0) return null;
      return Math.min(a / t, 1) * 100;
    }
    case "MAX_NUMERIC":
    case "MAX_PERCENT": {
      const t = parseFloat(target);
      const a = parseFloat(actualValue);
      if (isNaN(t) || isNaN(a) || a === 0) return null;
      return Math.min(t / a, 1) * 100;
    }
    case "TIMELINE": {
      const deadline = new Date(target);
      const completed = new Date(actualValue);
      if (isNaN(deadline.getTime()) || isNaN(completed.getTime())) return null;
      return completed <= deadline ? 100 : 0;
    }
    case "ZERO": {
      const a = parseFloat(actualValue);
      return a === 0 ? 100 : 0;
    }
    default:
      return null;
  }
}

export function getWeightedScore(score: number | null, weightage: number): number {
  if (score === null) return 0;
  return (score * weightage) / 100;
}

export function getUomLabel(uomType: string): string {
  switch (uomType) {
    case "MIN_NUMERIC": return "Numeric (Higher is better)";
    case "MIN_PERCENT": return "% (Higher is better)";
    case "MAX_NUMERIC": return "Numeric (Lower is better)";
    case "MAX_PERCENT": return "% (Lower is better)";
    case "TIMELINE": return "Timeline";
    case "ZERO": return "Zero-based";
    default: return uomType;
  }
}

export function formatTarget(uomType: string, target: string): string {
  switch (uomType) {
    case "MIN_PERCENT":
    case "MAX_PERCENT":
      return `${target}%`;
    case "TIMELINE":
      return new Date(target).toLocaleDateString();
    case "ZERO":
      return "0 (Zero incidents)";
    default:
      return target;
  }
}
