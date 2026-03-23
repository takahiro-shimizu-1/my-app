import type { Partner } from '../../../../types';

export interface ScriptTemplate {
  id: string;
  label: string;
  type: 'talk' | 'email';
  subject?: string;
  content: string;
}

// プレースホルダー: {{企業名}}, {{担当者名}}, {{電話番号}}, {{案件名}}, {{自社名}}, {{自社担当者}}
export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'talk-intro',
    label: '初回架電',
    type: 'talk',
    content: `【挨拶】
お世話になっております。{{自社名}}の{{自社担当者}}と申します。

【用件】
本日は「{{案件名}}」の件でご連絡させていただきました。
{{企業名}}様にぜひご協力いただきたく、お電話いたしました。

【確認事項】
・本案件へのご参加は可能でしょうか？
・現地調査のご対応は可能でしょうか？
・概算見積のご提出は可能でしょうか？

【クロージング】
ありがとうございます。それでは詳細資料をお送りさせていただきます。
{{担当者名}}様、よろしくお願いいたします。`,
  },
  {
    id: 'talk-followup',
    label: 'フォローアップ',
    type: 'talk',
    content: `【挨拶】
お世話になっております。{{自社名}}の{{自社担当者}}です。

【用件】
先日ご連絡させていただいた「{{案件名}}」の件で、
その後のご検討状況をお伺いしたくお電話いたしました。

【確認事項】
・ご検討いただけましたでしょうか？
・ご不明点などございますか？
・見積書のご提出予定はいつ頃になりそうでしょうか？

【クロージング】
ありがとうございます。引き続きよろしくお願いいたします。`,
  },
  {
    id: 'email-request',
    label: '資料送付依頼',
    type: 'email',
    subject: '【{{案件名}}】資料送付のお願い',
    content: `{{企業名}}
{{担当者名}} 様

お世話になっております。
{{自社名}}の{{自社担当者}}でございます。

「{{案件名}}」につきまして、
下記資料のご送付をお願いしたく、ご連絡いたしました。

【ご依頼資料】
・会社概要
・工事実績一覧
・技術者名簿

ご多忙のところ恐れ入りますが、
ご対応のほどよろしくお願いいたします。

――――――――――――――――
{{自社名}}
{{自社担当者}}
――――――――――――――――`,
  },
  {
    id: 'email-estimate',
    label: '見積依頼',
    type: 'email',
    subject: '【{{案件名}}】見積書作成のお願い',
    content: `{{企業名}}
{{担当者名}} 様

お世話になっております。
{{自社名}}の{{自社担当者}}でございます。

「{{案件名}}」につきまして、
見積書の作成をお願いしたく、ご連絡いたしました。

【案件概要】
・案件名：{{案件名}}
・提出期限：○月○日

詳細は添付資料をご確認ください。
ご不明点がございましたら、お気軽にお問い合わせください。

何卒よろしくお願いいたします。

――――――――――――――――
{{自社名}}
{{自社担当者}}
――――――――――――――――`,
  },
];

export const replacePlaceholders = (
  template: string,
  partner: Partner,
  projectName: string,
  companyName: string,
  myName: string
): string => {
  return template
    .replace(/\{\{企業名\}\}/g, partner.name)
    .replace(/\{\{担当者名\}\}/g, partner.contactPerson)
    .replace(/\{\{電話番号\}\}/g, partner.phone)
    .replace(/\{\{案件名\}\}/g, projectName)
    .replace(/\{\{自社名\}\}/g, companyName)
    .replace(/\{\{自社担当者\}\}/g, myName);
};
