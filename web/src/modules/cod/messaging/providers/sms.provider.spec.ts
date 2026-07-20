import { SmsProvider } from './sms.provider';

describe('SmsProvider', () => {
  const provider = new SmsProvider();

  it('counts a short ASCII message as one segment', () => {
    expect(provider.countSegments('A'.repeat(160))).toBe(1);
  });

  it('counts concatenated ASCII messages using 153 characters per segment', () => {
    expect(provider.countSegments('A'.repeat(161))).toBe(2);
  });

  it('uses Unicode segment limits for Vietnamese text', () => {
    expect(provider.countSegments('Đ'.repeat(71))).toBe(2);
  });
});
