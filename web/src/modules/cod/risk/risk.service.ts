import { BadRequestException, Injectable } from '@nestjs/common';
import { BlacklistEntryType, Prisma } from '@prisma/client';
import { normalizeVietnamPhone } from '../utils/phone-normalizer';
import { RiskRepository } from './risk.repository';
import {
  BlacklistCandidate,
  RiskEvaluationInput,
  RiskResult,
  RiskRuleAction,
  RiskRuleCondition,
} from './risk.types';

@Injectable()
export class RiskService {
  constructor(private readonly risks: RiskRepository) {}

  async evaluate(input: RiskEvaluationInput): Promise<RiskResult> {
    if (!input.isCod) {
      return { score: 0, reasons: [] };
    }

    await this.risks.ensureDefaultRules(input.shopId);

    const reasons: string[] = [];
    let score = 0;

    const blacklistResult = await this.evaluateBlacklist(input);
    score += blacklistResult.score;
    reasons.push(...blacklistResult.reasons);

    const phoneCancelCount = input.normalizedPhone
      ? await this.risks.countCancelledOrdersByPhone({
          shopId: input.shopId,
          normalizedPhone: input.normalizedPhone,
          excludeShopifyOrderGid: input.shopifyOrderGid,
        })
      : 0;
    const rules = await this.risks.findEnabledRules(input.shopId);

    for (const rule of rules) {
      const condition = this.asCondition(rule.conditionJson);
      const action = this.asAction(rule.actionJson);

      if (
        !condition ||
        !action ||
        !this.matchesRule(condition, input, phoneCancelCount)
      ) {
        continue;
      }

      score += action.score;
      reasons.push(`rule:${action.score}:${action.reason}`);
    }

    return {
      score: Math.min(score, 100),
      reasons: [...new Set(reasons)],
    };
  }

  async listRules(shopId: number) {
    await this.risks.ensureDefaultRules(shopId);
    return this.risks.listRules(shopId);
  }

  createRule(shopId: number, dto: Record<string, unknown>) {
    const parsed = this.parseRuleDto(dto);

    return this.risks.createRule(shopId, {
      name: parsed.name,
      enabled: parsed.enabled,
      priority: parsed.priority,
      conditionJson: parsed.conditionJson as Prisma.InputJsonValue,
      actionJson: parsed.actionJson as Prisma.InputJsonValue,
    });
  }

  updateRule(id: number, shopId: number, dto: Record<string, unknown>) {
    const data: Prisma.CodRiskRuleUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.requiredString(dto.name, 'name');
    }

    if (dto.enabled !== undefined) {
      if (typeof dto.enabled !== 'boolean') {
        throw new BadRequestException('enabled must be boolean');
      }

      data.enabled = dto.enabled;
    }

    if (dto.priority !== undefined) {
      data.priority = this.integerInRange(dto.priority, 'priority', 1, 10000);
    }

    if (dto.conditionJson !== undefined) {
      data.conditionJson = this.parseCondition(
        dto.conditionJson,
      ) as Prisma.InputJsonValue;
    }

    if (dto.actionJson !== undefined) {
      data.actionJson = this.parseAction(
        dto.actionJson,
      ) as Prisma.InputJsonValue;
    }

    return this.risks.updateRule(id, shopId, data);
  }

  deleteRule(id: number, shopId: number) {
    return this.risks.deleteRule(id, shopId);
  }

  listBlacklist(shopId: number) {
    return this.risks.listBlacklist(shopId);
  }

  createBlacklistEntry(shopId: number, dto: Record<string, unknown>) {
    const type = this.parseBlacklistType(dto.type);
    const value = this.requiredString(dto.value, 'value');
    const normalizedValue = this.normalizeBlacklistValue(type, value);
    const reason =
      dto.reason === undefined || dto.reason === null
        ? null
        : this.requiredString(dto.reason, 'reason');

    return this.risks.upsertBlacklistEntry({
      shopId,
      type,
      value,
      normalizedValue,
      reason,
    });
  }

  deleteBlacklistEntry(id: number, shopId: number) {
    return this.risks.deleteBlacklistEntry(id, shopId);
  }

  getBlacklistScoring(shopId: number) {
    return this.risks.getBlacklistScoring(shopId);
  }

  updateBlacklistScoring(
    shopId: number,
    dto: Record<string, unknown>,
  ) {
    const data: {
      blacklistPhoneEnabled?: boolean;
      blacklistPhoneScore?: number;
      blacklistEmailEnabled?: boolean;
      blacklistEmailScore?: number;
      blacklistAddressEnabled?: boolean;
      blacklistAddressScore?: number;
    } = {};

    for (const key of [
      'blacklistPhoneEnabled',
      'blacklistEmailEnabled',
      'blacklistAddressEnabled',
    ] as const) {
      if (dto[key] !== undefined) {
        if (typeof dto[key] !== 'boolean') {
          throw new BadRequestException(`${key} must be a boolean`);
        }

        data[key] = dto[key];
      }
    }

    for (const key of [
      'blacklistPhoneScore',
      'blacklistEmailScore',
      'blacklistAddressScore',
    ] as const) {
      if (dto[key] !== undefined) {
        data[key] = this.integerInRange(dto[key], key, 1, 100);
      }
    }

    return this.risks.updateBlacklistScoring(shopId, data);
  }

  private async evaluateBlacklist(input: RiskEvaluationInput) {
    const candidates = this.getBlacklistCandidates(input).map((candidate) => ({
      type: candidate.type,
      normalizedValue: this.normalizeBlacklistValue(
        candidate.type,
        candidate.value,
      ),
    }));
    const hits = await this.risks.findBlacklistHits(input.shopId, candidates);
    const scoring = await this.risks.getBlacklistScoring(input.shopId);

    await this.risks.markBlacklistHits(hits.map((hit) => hit.id));

    let score = 0;
    const reasons: string[] = [];

    for (const hit of hits) {
      if (
        hit.type === BlacklistEntryType.PHONE &&
        scoring.blacklistPhoneEnabled
      ) {
        score += scoring.blacklistPhoneScore;
        reasons.push(`blacklist:phone:${scoring.blacklistPhoneScore}`);
      } else if (
        hit.type === BlacklistEntryType.EMAIL &&
        scoring.blacklistEmailEnabled
      ) {
        score += scoring.blacklistEmailScore;
        reasons.push(`blacklist:email:${scoring.blacklistEmailScore}`);
      } else if (
        hit.type === BlacklistEntryType.ADDRESS &&
        scoring.blacklistAddressEnabled
      ) {
        score += scoring.blacklistAddressScore;
        reasons.push(`blacklist:address:${scoring.blacklistAddressScore}`);
      }
    }

    return { score, reasons };
  }

  private getBlacklistCandidates(
    input: RiskEvaluationInput,
  ): BlacklistCandidate[] {
    const candidates: BlacklistCandidate[] = [];

    if (input.normalizedPhone || input.customerPhone) {
      candidates.push({
        type: BlacklistEntryType.PHONE,
        value: input.normalizedPhone || input.customerPhone || '',
      });
    }

    if (input.customerEmail) {
      candidates.push({
        type: BlacklistEntryType.EMAIL,
        value: input.customerEmail,
      });
    }

    const address = this.buildAddressCandidate(input);

    if (address) {
      candidates.push({ type: BlacklistEntryType.ADDRESS, value: address });
    }

    return candidates;
  }

  private matchesRule(
    condition: RiskRuleCondition,
    input: RiskEvaluationInput,
    phoneCancelCount: number,
  ) {
    if (condition.type === 'missing_phone') {
      return !input.normalizedPhone;
    }

    if (condition.type === 'missing_email') {
      return !input.customerEmail;
    }

    if (condition.type === 'amount_gte') {
      return Number(input.totalAmount || 0) >= condition.amount;
    }

    if (condition.type === 'province_in') {
      return this.normalizedIncludes(condition.values, input.shippingProvince);
    }

    if (condition.type === 'city_in') {
      return this.normalizedIncludes(condition.values, input.shippingCity);
    }

    if (condition.type === 'location_in') {
      return (
        this.normalizedIncludes(
          condition.provinces || [],
          input.shippingProvince,
        ) || this.normalizedIncludes(condition.cities || [], input.shippingCity)
      );
    }

    if (condition.type === 'phone_cancel_count_gte') {
      return (
        Boolean(input.normalizedPhone) && phoneCancelCount >= condition.count
      );
    }

    return false;
  }

  private parseRuleDto(dto: Record<string, unknown>) {
    return {
      name: this.requiredString(dto.name, 'name'),
      enabled: typeof dto.enabled === 'boolean' ? dto.enabled : true,
      priority: this.integerInRange(dto.priority ?? 100, 'priority', 1, 10000),
      conditionJson: this.parseCondition(dto.conditionJson),
      actionJson: this.parseAction(dto.actionJson),
    };
  }

  private parseCondition(value: unknown): RiskRuleCondition {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('conditionJson must be an object');
    }

    const condition = value as Record<string, unknown>;

    if (
      condition.type === 'missing_phone' ||
      condition.type === 'missing_email'
    ) {
      return { type: condition.type };
    }

    if (condition.type === 'amount_gte') {
      return {
        type: 'amount_gte',
        amount: this.positiveNumber(condition.amount, 'conditionJson.amount'),
      };
    }

    if (condition.type === 'province_in') {
      return {
        type: 'province_in',
        values: this.stringArray(condition.values),
      };
    }

    if (condition.type === 'city_in') {
      return { type: 'city_in', values: this.stringArray(condition.values) };
    }

    if (condition.type === 'location_in') {
      return {
        type: 'location_in',
        provinces: this.optionalStringArray(condition.provinces),
        cities: this.optionalStringArray(condition.cities),
      };
    }

    if (condition.type === 'phone_cancel_count_gte') {
      return {
        type: 'phone_cancel_count_gte',
        count: this.integerInRange(
          condition.count,
          'conditionJson.count',
          1,
          1000,
        ),
      };
    }

    throw new BadRequestException('Unsupported risk rule condition type');
  }

  private parseAction(value: unknown): RiskRuleAction {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('actionJson must be an object');
    }

    const action = value as Record<string, unknown>;

    return {
      score: this.integerInRange(action.score, 'actionJson.score', 1, 100),
      reason: this.requiredString(action.reason, 'actionJson.reason'),
    };
  }

  private asCondition(value: unknown): RiskRuleCondition | null {
    try {
      return this.parseCondition(value);
    } catch {
      return null;
    }
  }

  private asAction(value: unknown): RiskRuleAction | null {
    try {
      return this.parseAction(value);
    } catch {
      return null;
    }
  }

  private parseBlacklistType(value: unknown) {
    if (
      value === BlacklistEntryType.PHONE ||
      value === BlacklistEntryType.EMAIL ||
      value === BlacklistEntryType.ADDRESS
    ) {
      return value;
    }

    throw new BadRequestException('Invalid blacklist type');
  }

  private normalizeBlacklistValue(type: BlacklistEntryType, value: string) {
    if (type === BlacklistEntryType.PHONE) {
      return normalizeVietnamPhone(value) || this.normalizeText(value);
    }

    if (type === BlacklistEntryType.EMAIL) {
      return value.trim().toLowerCase();
    }

    return this.normalizeText(value);
  }

  private buildAddressCandidate(input: RiskEvaluationInput) {
    const address = input.shippingAddressJson || {};
    const parts = [
      this.stringValue(address.address1),
      this.stringValue(address.address2),
      input.shippingDistrict,
      input.shippingCity,
      input.shippingProvince,
      this.stringValue(address.zip),
    ].filter(Boolean);

    return parts.join(' ');
  }

  private normalizedIncludes(values: string[], candidate: string | null) {
    if (!candidate) {
      return false;
    }

    const normalizedCandidate = this.normalizeText(candidate);

    return values.some(
      (value) => this.normalizeText(value) === normalizedCandidate,
    );
  }

  private normalizeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private stringArray(value: unknown) {
    if (!Array.isArray(value)) {
      throw new BadRequestException('Expected an array of strings');
    }

    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  private optionalStringArray(value: unknown) {
    if (value === undefined) {
      return [];
    }

    return this.stringArray(value);
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(field + ' is required');
    }

    return value.trim();
  }

  private integerInRange(
    value: unknown,
    field: string,
    min: number,
    max: number,
  ) {
    if (
      !Number.isInteger(value) ||
      (value as number) < min ||
      (value as number) > max
    ) {
      throw new BadRequestException(
        field + ' must be between ' + min + ' and ' + max,
      );
    }

    return value as number;
  }

  private positiveNumber(value: unknown, field: string) {
    if (typeof value !== 'number' || value <= 0) {
      throw new BadRequestException(field + ' must be a positive number');
    }

    return value;
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
