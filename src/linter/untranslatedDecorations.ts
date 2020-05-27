import * as vscode from 'vscode';
import { findChineseText } from './findUntranslatedText';
import { getConfiguration } from '../utils';

let timeout: any = null;
let prevChineseCharDecoration: any = null;

/**
 * 中文的标记，红框样式
 */
function getChineseCharDecoration() {
  // 配置提示框样式
  const hasOverviewRuler = getConfiguration('showOverviewRuler');
  const shouldMark = getConfiguration('markStringLiterals');
  const color = getConfiguration('markColor') as string;
  return vscode.window.createTextEditorDecorationType({
    borderWidth: shouldMark ? '1px' : undefined,
    borderStyle: shouldMark ? 'dotted' : undefined,
    overviewRulerColor: hasOverviewRuler ? color : undefined,
    overviewRulerLane: hasOverviewRuler ? vscode.OverviewRulerLane.Right : undefined,
    light: { borderColor: shouldMark ? color : undefined },
    dark: { borderColor: shouldMark ? color : undefined },
  });
}

function updateDecorations() {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) return;

  const currentFilename = activeEditor.document.fileName;
  const chineseCharDecoration = getChineseCharDecoration();
  const text = activeEditor.document.getText();
  const targetStrs = findChineseText(text, currentFilename);

  const chineseChars = targetStrs.map((match: any) => {
    return {
      range: match.range,
      hoverMessage: `Untranslated text found： ${match.text}`
    };
  });

  const shouldMark = getConfiguration('markStringLiterals');
  if (shouldMark !== true) return;

  /** 设置中文的提示 */
  activeEditor.setDecorations(chineseCharDecoration, chineseChars);

  return chineseCharDecoration;
}

export function triggerUpdateDecorations() {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    const activeEditor = vscode.window.activeTextEditor;
    if (prevChineseCharDecoration) activeEditor!.setDecorations(prevChineseCharDecoration, []);
    prevChineseCharDecoration = updateDecorations();
  }, 500);
}
