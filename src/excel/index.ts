import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as json2xls from 'json2xls';
import { localize } from '../utils/locale';
import { getConfiguration } from '../utils';
const { readDirDeepSync } = require('read-dir-deep');
const excelToJson = require('convert-excel-to-json');
import { selectFile, selectFolder } from '../utils/quick-pick';
import * as dayjs from 'dayjs';

interface ILanguageFile {
  name: string,
  path: string,
}
/**
 * 检查语言标识符是否已配置
 */
function checkLanguageTypesConfig() {
  const languageTypes = getConfiguration('languageTypes') || [];
  if (!languageTypes.length) {
    const message = localize('language-types-not-found', 'languageTypes not configured. Please check in setting panel');
    const gotoConfig = localize('go-to-settings', 'Go to settings');
    vscode.window.showErrorMessage(message);
    vscode.window.showInformationMessage(
      message,
      { modal: true },
      gotoConfig,
    )
      .then(result => {
        if (result === gotoConfig) {
          vscode.commands.executeCommand('workbench.action.openSettings', 'i18n-esign.languageTypes');
        }
      });
  }

  return languageTypes.length > 0;
}

/**
 * 遍历出文件夹下的语言文件
 * ePath: 文件夹路径
 */
function getLanguageFiles(ePath: string): ILanguageFile[] {
  const languageTypes = getConfiguration('languageTypes');
  const files: ILanguageFile[] = readDirDeepSync(ePath, {
    absolute: true,
    patterns: ['**/*.json'],
  })
    .filter((filePath: string) => {
      const { name } = path.parse(filePath);
      return languageTypes.includes(name);
    })
    .map((filePath: string) => {
      const { name } = path.parse(filePath);
      return { name, path: filePath };
    });

  return files;
}

/**
 * 读取 json 文件中的对象, 如果 json 格式不合法, 返回空对象
 * @param filePath
 */
function getJsonFromFile(filePath: string) {
  try {
    delete require.cache[filePath];
    return require(filePath);
  } catch (e) {
    console.error(e);
    console.warn(`Fail to require ${filePath}`);
    return {};
  }
}

/**
 * 读取多个 json 文件合并成一个 json 对象
 * {
 *   "xxx": {
 *     "zh-CN": "你好",
 *     "en-US": "hello"
 *   }
 * }
 */
function combineJson(files: ILanguageFile[]) {
  return files.reduce((result: any, file) => {
    const json = getJsonFromFile(file.path);
    Object.entries(json).forEach(([key, value]) => {
      result[key] = result[key] || {};
      result[key][file.name] = value;
    });

    return result;
  }, {});
}
/**
 * 将 json 转成 Excel
 * @param resultJson 多个语言文件合并出的 json 对象
 */
function generateExcel(resultJson: any, ePath: string) {
  // 用于生产 excel 的数组 [{ key: 'xxx', 'zh-CN': 'xxx', }]
  const excelArr = Object.entries(resultJson)
    .map(([key, langs]) => ({ key, ...langs as any }));

  const timeStr = dayjs().format('YYYY-MM-DD_HH.mm.ss');
  const excelPath = `${ePath}.${timeStr}--${Date.now()}.xlsx`;
  const xls = json2xls(excelArr);
  fs.writeFileSync(excelPath, xls, 'binary');
  const message = localize('success', 'Excel file generate success! Path:');
  vscode.window.showInformationMessage(`${message} ${excelPath}`);
}

/**
 * 抽取 Excel 的命令
 * @param e 点击事件
 */
function handleExcelCmd(e: any) {
  try {
    if (!checkLanguageTypesConfig()) return;

    const files = getLanguageFiles(e.fsPath);
    // 当前目录下没有找到 json 文件, 直接返回
    if (files.length === 0) {
      const message = localize('file-not-found', 'File not found, please check path');
      vscode.window.showErrorMessage(`${message} ${e.fsPath}`);
      return;
    }

    const resultJson: any = combineJson(files);
    generateExcel(resultJson, e.fsPath);
  } catch (e) {
    console.error(e);
    const message = localize('fail', 'Fail to generate excel file, please open vscode devTools to checkout error messages');
    vscode.window.showErrorMessage(message);
  }
}


/**
 * 读取 excel 文件内容, 输出 json 结构
 * @param excelPath
 */
function convertExcelToJson(excelPath: string): void {
  const originResult = excelToJson({
    sourceFile: excelPath,
  });

  // 约定 excel 有且只有一个 sheet
  const sheetName = Object.keys(originResult)[0];
  const json = originResult[sheetName];
  const titleRow = json[0];

  /*
  result 是如下结构
  {
    'zh-CN': { aaa: 'xxx', bbb: 'yyy' },
    'en-US': { aaa: '111', bbb: '222' },
  }
  */
  const result: any = {};
  json
    .slice(1)
    .map((row: any) => {
      // 用第一行的 value 作为数组每个 item 的 key
      return Object.entries(titleRow).reduce((temp: any, [columnID, title]) => {
        temp[title as string] = row[columnID];
        return temp;
      }, {});
    })
    .forEach((item: any) => {
      Object.keys(item).filter(key => key !== 'key').forEach(language => {
        result[language] = result[language] || {};
        result[language][item.key] = item[language];
      });
    });

  return result;
}

/**
 * 根据 Excel 文件更新 json 文件
 * @param e 点击事件
 */
async function handleUpdateByExcelCmd(e: any, context: vscode.ExtensionContext) {
  try {
    let excelPath: string = '';
    if (e) {
      excelPath = e.fsPath;
    } else {
      const uri = await selectFile();
      if (!uri || !uri.length) return;
      excelPath = uri[0].fsPath;
    }
    if (!excelPath) return;

    const json = convertExcelToJson(excelPath);
    console.info(json);

    const languageDir = await selectFolder(context);
    if (!languageDir) return;

    const languageAbsoluteDir = languageDir.fsLocation.absolute;
    console.info(languageAbsoluteDir);
    recursiveUpdateJson(languageAbsoluteDir, json);

    const message = localize('json-update-success', 'Update success');
    vscode.window.showInformationMessage(message);
  } catch (e) {
    console.error(e);
    const message = localize('json-update-fail', 'Update fail, please check error logs in devTools');
    vscode.window.showErrorMessage(message);
  }
}

/**
 * 更新目录下的所有语言 json 文件
 * @param folderPath 目录路径
 * @param allJson excel 文件中解析出的 json
 */
function recursiveUpdateJson(folderPath: string, allJson: any): void {
  const files = getLanguageFiles(folderPath);
  // 当前目录下没有找到 json 文件, 直接返回
  if (files.length === 0) {
    const message = localize('file-not-found', 'File not found, please check path');
    vscode.window.showErrorMessage(`${message} ${folderPath}`);
    return;
  }

  files.forEach(file => {
    const json = getJsonFromFile(file.path);
    const language = file.name;
    Object.keys(json).forEach(key => {
      const oldValue = json[key];
      const newValue = allJson[language][key];
      json[key] = newValue === undefined ? oldValue : newValue;
    });

    const jsonText = JSON.stringify(json, null, 2);
    fs.writeFileSync(file.path, jsonText);
  });
}

/**
 * 注册 Excel 的功能
 * @param context
 */
function registerExcelCmd(context: vscode.ExtensionContext) {
  checkLanguageTypesConfig();

  const disposable = vscode.commands.registerCommand('i18n-esign.excel', handleExcelCmd);
  const disposable2 = vscode.commands.registerCommand('i18n-esign.updateByExcel', (e) => handleUpdateByExcelCmd(e, context));

  context.subscriptions.push(disposable, disposable2);

  return [disposable, disposable2];
}

export {
  registerExcelCmd,
};
