# i18n-esign

Simple VSCode extension, easy to use

<p align='center'>
English | <a href="https://github.com/yubaoquan/i18n-esign/blob/master/README.zh-CN.md">简体中文</a>
</p>

## Features

1. Combine all i18n language json files into one Excel file.
2. Update json file from excel file.
3. Highlight Chinese characters.


![laa2.gif](https://i.loli.net/2020/04/30/kt1QnPuefgpKWAr.gif)

source:

![src-code.png](https://i.loli.net/2020/04/30/RQK6PzqrG1DxBAV.png)

result:

![Excel.png](https://i.loli.net/2020/04/30/LDnbU3VsR1TaFHi.png)

## Requirements

No

## Extension Settings

- languageTypes: Extension will find json files with these names (en-US.json, zh-CN.json), and generate Excel with columns named by this names.
- enableLinter: Mark string literals in editor so you can quickly spot on them.
- markColor: The color of matched non-English letters.

## Known Issues

No

## Release Notes

### 0.0.1

init

### 0.0.2

update readme

### 0.0.3

update readme

### 0.1.0

Add linter feature. Chinese characters will be marked a red border.
Some code copy from [kiwi-linter](https://github.com/alibaba/kiwi/tree/master/kiwi-linter)

### 0.1.1
Add missing dependency: typescript

### 0.1.2
Move typescript from devDependency to dependency

### 0.1.3
Add missing dependency

### 0.2.0
Add new feature:

  1. support recursive find json in directory to generate excel;
  2. update json files from excel;

Some code copy from [vscode-advanced-new-file](https://github.com/patbenatar/vscode-advanced-new-file)

### 0.2.1
Fix bug of not showing red border on Chinese characters.

### 0.2.2
Fix bug of parsing invalid json content in json file.

### 0.3.0
Fix bug of not founding new added text when generating excel after json file changed;
Change excel file name format;

### 3.0.1
Exclude node_modules

**Enjoy!**
