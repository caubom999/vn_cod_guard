export type RiskBand = {
  label: 'Low' | 'Medium' | 'High' | 'Critical';
  range: string;
  tone: 'success' | 'attention' | 'warning' | 'critical';
};

export function getRiskBand(score: number): RiskBand {
  if (score >= 75) {
    return { label: 'Critical', range: '75–100', tone: 'critical' };
  }

  if (score >= 50) {
    return { label: 'High', range: '50–74', tone: 'warning' };
  }

  if (score >= 25) {
    return { label: 'Medium', range: '25–49', tone: 'attention' };
  }

  return { label: 'Low', range: '0–24', tone: 'success' };
}
