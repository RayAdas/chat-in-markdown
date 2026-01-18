const vscode = require('vscode');
const sm = require('./scripts/split_markdown');
const OpenAI = require('openai');

async function activate(context) {
  
  // console.log('扩展chat-in-markdown已被激活！');

  // 注册命令
  let disposable = vscode.commands.registerCommand('chat-in-markdown.sendChat', async () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
      vscode.window.showErrorMessage('Active file is not a Markdown document!');
      return;
    }

    const content = activeEditor.document.getText(); // 获取整个文档内容
    const position = activeEditor.selection.active;  // 获取光标位置
    const line = position.line;  // 获取光标所在行，0-based
    const configuration = vscode.workspace.getConfiguration('chat-in-markdown');
    const baseURL = configuration.get('baseURL');
    const model = configuration.get('model');

  // 从 VS Code SecretStorage 中获取 API Key，如不存在则尝试从旧配置迁移或提示用户输入
  let apiKey = await context.secrets.get('chat-in-markdown.apiKey');
  if (!apiKey) {
    const legacyApiKey = configuration.get('apiKey');
    if (legacyApiKey) {
      apiKey = legacyApiKey;
      await context.secrets.store('chat-in-markdown.apiKey', apiKey);
    }
  }

  if (!apiKey) {
    apiKey = await vscode.window.showInputBox({
      prompt: 'Please enter your LLM API Key',
      ignoreFocusOut: true,
      password: true,
    });
    if (!apiKey) {
      vscode.window.showErrorMessage('LLM API Key not set!');
      return;
    }
    await context.secrets.store('chat-in-markdown.apiKey', apiKey);
  }

    if (!baseURL) {
      vscode.window.showErrorMessage('LLM Base URL not set!');
      return;
    }

    if (!model) {
      vscode.window.showErrorMessage('LLM Model not set!');
      return;
    }

    await main(content, line, apiKey, baseURL, model, activeEditor);
  });

  context.subscriptions.push(disposable);
}

async function main(content, cursorLine, apiKey, baseURL, model, activeEditor) {
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  // 解析 markdown，获取所有标题
  const tokens = sm.parseMarkdown(content);
  const headings = sm.getH1H2Headings(tokens);
  const [contextStartLine, nextH1Line] = sm.getContextLineRange(cursorLine, headings);

  // 检查是否找到前置H1
  if (contextStartLine === -1) {
    vscode.window.showErrorMessage('No preceding H1 heading found!');
    return;
  }
  const content_lines = content.split('\n');

  // 若未找到下一个H1，则设为全文结尾
  const contextEndLine = nextH1Line === -1 ? content_lines.length : nextH1Line; 
  
  // 获取上下文范围内的所有H2
  const h2s = sm.getAllH2inRange(headings, contextStartLine, contextEndLine);
  
  // 构建拆分点数组
  const splitLines = [];
  for (const h2 of h2s) {
    splitLines.push(h2.line);
  }
  splitLines.push(contextEndLine);

  // 按照拆分点拆分文本
  const h2ps = sm.splitTextByLines(content_lines, splitLines);
  
  let message_length = 0;
  if (h2ps.length === h2s.length) {
    message_length = h2s.length;
  } else {
    vscode.window.showErrorMessage('Error in splitting text by H2 headings!');
    return;
  }

  // 拼接消息
  const messages = [];
  for (let i = 0; i < message_length; i++) {
    const head = h2s[i].text;
    const text = h2ps[i];
    messages.push({ "role": head, "content": text });
  }

  try {
    // Streaming:
    const stream = await openai.chat.completions.create({
      messages: messages,
      model: model,
      stream: true,
    });

    let insertPosition = new vscode.Position(
      contextEndLine - 1,
      activeEditor.document.lineAt(contextEndLine - 1).text.length
    );

    const aswTitle = '\n' + '## assistant' + '\n';
    insertPosition = await insertTextAndReturnNewPosition(aswTitle, insertPosition, activeEditor);

    let fullResponse = ''; // 新建一个变量用于储存大模型流式输出
    for await (const part of stream) {
      const deltaContent = part.choices[0]?.delta?.content || '';
      if (deltaContent) {
        fullResponse += deltaContent; // 将内容追加到 fullResponse 变量中
        insertPosition = await insertTextAndReturnNewPosition(deltaContent, insertPosition, activeEditor);
      }
    }
		
    // 检查大模型的流式输出是否包含标题，若包含标题则将标题下调两级
    const responseTokens = sm.parseMarkdown(fullResponse);
    const responseHeadings = sm.getH1H2Headings(responseTokens);
    for (const head of responseHeadings) {
      const headsPos = new vscode.Position(head.line + contextEndLine + 1, 0);
      insertPosition = await insertTextAndReturnNewPosition('##', headsPos, activeEditor);
    }
  } catch (error) {
    console.error('Error during LLM streaming:', error);
    const message = error && error.message ? error.message : String(error);
    vscode.window.showErrorMessage(`LLM 流式响应出错: ${message}`);
  }
}

/**
 * 插入文本并更新光标位置
 * @param {string} text 要插入的文本
 * @param {vscode.Position} position 插入文本的起始位置
 * @param {vscode.TextEditor} editor 当前的 VS Code 编辑器对象
 * @returns {Promise<vscode.Position>} 返回插入文本后新的光标位置
 */
async function insertTextAndReturnNewPosition(text, position, editor) {
  const lines = text.split('\n'); // 将文本按行分割
  let newPosition;

  // 插入操作
  const success = await editor.edit(editBuilder => {
      editBuilder.insert(position, text);  // 插入文本
  });

  if (success) {
      // console.log('Text inserted successfully!');
  } else {
      // console.log('Failed to insert text.');
      return position;  // 如果插入失败，返回原位置
  }

  // 计算插入后的光标位置
  if (lines.length === 1) {
      // 插入的是单行文本，光标应该移动到文本的末尾
      newPosition = new vscode.Position(position.line, position.character + text.length);
  } else {
      // 插入的是多行文本，光标应该跳到插入文本的最后一行的末尾
      newPosition = new vscode.Position(position.line + lines.length - 1, lines[lines.length - 1].length);
  }

  // 返回新的光标位置
  return newPosition;
}

function deactivate() {
}

module.exports = { activate, deactivate };