'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { compact, startsWith, sortBy } from 'lodash';
import * as gitignoreToGlob from 'gitignore-to-glob';
import { sync as globSync } from 'glob';
// const Cache = require('vscode-cache');
import * as Cache from 'vscode-cache';
import { QuickPickItem } from 'vscode';

export interface FSLocation {
  relative: string;
  absolute: string;
}

export interface WorkspaceRoot {
  rootPath: string;
  baseName: string;
  multi: boolean;
}

export interface DirectoryOption {
  displayText: string;
  fsLocation: FSLocation;
}

declare module 'vscode' {
  interface QuickPickItem {
    option?: DirectoryOption
  }
}


function invertGlob(pattern: string): string {
  return pattern.replace(/^!/, '');
}

function walkupGitignores(dir: string, found: string[] = []): string[] {
  const gitignore = path.join(dir, '.gitignore');
  if (fs.existsSync(gitignore)) found.push(gitignore);

  const parentDir = path.resolve(dir, '..');
  const reachedSystemRoot = dir === parentDir;

  if (!reachedSystemRoot) {
    return walkupGitignores(parentDir, found);
  } else {
    return found;
  }
}

function flatten(memo: any[], item: any): any[] {
  return memo.concat(item);
}

function gitignoreGlobs(root: string): string[] {
  const gitignoreFiles = walkupGitignores(root);
  return gitignoreFiles.map(g => gitignoreToGlob(g)).reduce(flatten, []);
}

function configIgnoredGlobs(root: string): string[] {
  // todo 过滤不要的文件
  // const configFilesExclude = Object.assign(
  //   [],
  //   vscode.workspace.getConfiguration('advancedNewFile').get('exclude'),
  //   vscode.workspace.getConfiguration('files.exclude', vscode.Uri.file(root))
  // );

  const configFilesExclude: any = [];
  const configIgnored = Object.keys(configFilesExclude)
    .filter(key => configFilesExclude[key] === true);

  return gitignoreToGlob(configIgnored.join('\n'), { string: true });
}

function directoriesSync(root: string): FSLocation[] {
  // const ignore = gitignoreGlobs(root).concat(configIgnoredGlobs(root)).map(invertGlob);
  const ignore: any = [];

  const results = globSync('**', { cwd: root, ignore })
    .map((f): FSLocation => {
      return {
        relative: path.join(path.sep, f),
        absolute: path.join(root, f)
      };
    })
    .filter(f => fs.statSync(f.absolute).isDirectory())
    .map(f => f);

  return results;
}

function convenienceOptions(roots: WorkspaceRoot[], cache: Cache): vscode.QuickPickItem[] {
  const config: string[] | undefined = vscode.workspace
    .getConfiguration('advancedNewFile')
    .get('convenienceOptions');

  const ls = lastSelection(cache);
  const cepo = currentEditorPathOption(roots);

  const optionsByName: any = {
    last: ls ? [buildQuickPickItem(ls, '- last selection')] : [],
    current: cepo ? [buildQuickPickItem(cepo, '- current file')] : [],
    root: rootOptions(roots).map(o => buildQuickPickItem(o, '- workspace root'))
  };

  const options = config
    ?.map<vscode.QuickPickItem[]>(c => optionsByName[c])
    .reduce(flatten);

  return compact<vscode.QuickPickItem>(options);
}

async function subdirOptionsForRoot(root: WorkspaceRoot): Promise<DirectoryOption[]> {
  const dirs = await directories(root.rootPath);

  return dirs.map((dir: FSLocation): DirectoryOption => {
    const displayText = root.multi
      ? path.join(path.sep, root.baseName, dir.relative)
      : dir.relative;

    return {
      displayText,
      fsLocation: dir
    };
  });
}

export function showQuickPick(choices: Promise<vscode.QuickPickItem[]>): Thenable<QuickPickItem | undefined> {
  return vscode.window.showQuickPick<vscode.QuickPickItem>(choices, {
    placeHolder: 'Select folder to update'
  });
}

export async function showInputBox(
  baseDirectory: DirectoryOption): Promise<string> {

  try {
    const input = await vscode.window.showInputBox({
      prompt: `Relative to ${baseDirectory.displayText}`,
      placeHolder: 'Filename or relative path to file'
    });

    return path.join(baseDirectory.fsLocation.absolute, input || '');
  } catch (e) {
    console.error(e);
    return '';
  }
}

export function directories(root: string): Promise<FSLocation[]> {
  return new Promise((resolve, reject) => {
    const findDirectories = () => {
      try {
        resolve(directoriesSync(root));
      } catch (error) {
        reject(error);
      }
    };

    const delayToAllowVSCodeToRender = 1;
    setTimeout(findDirectories, delayToAllowVSCodeToRender);
  });
}

export function buildQuickPickItem(option: DirectoryOption, description: string = ''): vscode.QuickPickItem | undefined {

  if (!option) return;

  return {
    label: option.displayText,
    description,
    option
  };
}

export function currentEditorPath(): string | undefined {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) return;

  return path.dirname(activeEditor.document.fileName);
}

export function lastSelection(cache: Cache): DirectoryOption | undefined {
  if (!cache.has('last')) return;

  const value = cache.get('last');
  if (typeof value === 'object') return value as DirectoryOption;

  cache.forget('last');
}

export function workspaceRoots(): WorkspaceRoot[] {
  if (vscode.workspace.workspaceFolders) {
    const multi = vscode.workspace.workspaceFolders.length > 1;

    return vscode.workspace.workspaceFolders.map((folder) => {
      return {
        rootPath: folder.uri.fsPath,
        baseName: path.basename(folder.uri.fsPath),
        multi
      };
    });
  } else if (vscode.workspace.rootPath) {
    return [{
      rootPath: vscode.workspace.rootPath,
      baseName: path.basename(vscode.workspace.rootPath),
      multi: false
    }];
  } else {
    return [];
  }
}

export function rootOptions(roots: WorkspaceRoot[]): DirectoryOption[] {
  return roots.map((root): DirectoryOption => {
    return {
      displayText: root.multi ? path.join(path.sep, root.baseName) : path.sep,
      fsLocation: {
        relative: path.sep,
        absolute: root.rootPath
      }
    };
  });
}

export function currentEditorPathOption(roots: WorkspaceRoot[]): DirectoryOption | undefined {

  const currentFilePath = currentEditorPath() || '';
  const currentFileRoot = currentFilePath &&
    roots.find(r => currentFilePath.indexOf(r.rootPath) === 0);

  if (!currentFileRoot) return;

  const rootMatcher = new RegExp(`^${currentFileRoot.rootPath}`);
  let relativeCurrentFilePath = currentFilePath?.replace(rootMatcher, '') || '';

  relativeCurrentFilePath =
    relativeCurrentFilePath === '' ? path.sep : relativeCurrentFilePath;

  const displayText = currentFileRoot.multi ?
    path.join(path.sep, currentFileRoot.baseName, relativeCurrentFilePath) :
    relativeCurrentFilePath;

  return {
    displayText,
    fsLocation: {
      relative: relativeCurrentFilePath,
      absolute: currentFilePath
    }
  };
}

export async function dirQuickPickItems(roots: WorkspaceRoot[], cache: Cache): Promise<vscode.QuickPickItem[]> {

  const dirOptions = await Promise.all(
    roots.map(async r => await subdirOptionsForRoot(r))
  );
  let quickPickItems = dirOptions.reduce(flatten).map(o => buildQuickPickItem(o));

  quickPickItems.unshift(...convenienceOptions(roots, cache));

  return quickPickItems as any;
}

export function cacheSelection(cache: Cache, dir: DirectoryOption, root: WorkspaceRoot) {
  cache.put('last', dir);
  const recentRoots: any[] = cache.get('recentRoots') || [];
  const rootIndex = recentRoots.indexOf(root.rootPath);
  if (rootIndex >= 0) recentRoots.splice(rootIndex, 1);
  recentRoots.unshift(root.rootPath);
  cache.put('recentRoots', recentRoots);
}

export function sortRoots(
  roots: WorkspaceRoot[],
  desiredOrder: string[]): WorkspaceRoot[] {

  return sortBy(roots, (root) => {
    const desiredIndex = desiredOrder.indexOf(root.rootPath);
    return desiredIndex >= 0 ? desiredIndex : roots.length;
  });
}

export function rootForDir(
  roots: WorkspaceRoot[],
  dir: DirectoryOption): WorkspaceRoot {

  return roots.find(r => startsWith(dir.fsLocation.absolute, r.rootPath)) as any;
}

async function selectFolder(context: vscode.ExtensionContext) {
  const roots = workspaceRoots();

  if (!roots.length) {
    return vscode.window.showErrorMessage(
      'It doesn\'t look like you have a folder opened in your workspace. ' +
      'Try opening a folder first.'
    );
  }

  const cacheName = roots.map(r => r.rootPath).join(';');
  const cache: any = new Cache(context, `workspace:${cacheName}`);
  const sortedRoots = sortRoots(roots, cache.get('recentRoots') || []);

  const dirSelection = await showQuickPick(dirQuickPickItems(sortedRoots, cache));
  if (!dirSelection) return;

  const dir: any = dirSelection.option;
  const selectedRoot = rootForDir(roots, dir);
  cacheSelection(cache, dir, selectedRoot);

  return dir;
}

async function selectFile() {
  const file = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
  });

  console.info(file);
  return file;
}



export {
  selectFile,
  selectFolder,
};
