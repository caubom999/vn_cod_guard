import { Injectable } from '@nestjs/common';

export type MessageTemplateContext = Record<
  string,
  string | number | boolean | null | undefined
>;

@Injectable()
export class MessageTemplateRenderer {
  render(template: string, context: MessageTemplateContext) {
    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => {
      const value = context[key];

      if (value === null || value === undefined) {
        return '';
      }

      return String(value);
    });
  }
}
