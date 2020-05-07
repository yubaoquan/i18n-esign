import * as path from 'path';
import * as fs from 'fs';
interface IMessage {
  [prop: string]: string
}

const messages: IMessage = {};

/**
 * 初始化插件的多语言配置
 */
function localeInit() {
  const { locale } = JSON.parse(process.env.VSCODE_NLS_CONFIG as string);
  const filePath = path.resolve(__dirname, '../..', `package.nls.${locale}.json`);
  if (fs.existsSync(filePath)) {
    const res = require(filePath);
    Object.assign(messages, res);
    return;
  }

  console.error(`Load locale file ${filePath} fail, use English as fallback`);
}

function localize(key: string, defaultText: string) {
  return messages[key] || defaultText;
}

export {
  localeInit,
  localize
};
