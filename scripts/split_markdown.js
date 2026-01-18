const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

function parseMarkdown(markdownText) {
    const tokens = md.parse(markdownText, {});
    return tokens;
}

function getHeadingsByLevels(tokens, levelSet) {
    /*
    根据 levelSet 中指定的标题级别（1-6）返回所有匹配的标题。
    levelSet: 一个包含 1-6 的整数集合（如 new Set([1,2]) 或 [1,2,3]）。
    */

    const allowedLevels = levelSet instanceof Set ? levelSet : new Set(levelSet || []);
    const heads = [];

    if (allowedLevels.size === 0) {
        return heads;
    }

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type === 'heading_open') {
            const level = Number(token.tag.slice(1)); // h1 -> 1
            if (!allowedLevels.has(level)) {
                continue;
            }

            const inline = tokens[i + 1];
            heads.push({
                level,
                text: inline?.content ?? '',
                line: token.map[0], // 原 markdown 行号（0-based）
                endLine: token.map[1], // 结束行号（0-based）
            });
        }
    }

    // 防御式排序
    heads.sort((a, b) => a.line - b.line);

    return heads;
}

function getContextLineRange(cursorLine, headings) {
    /*
    返回两个0-based的行号，依次为起始行号，末尾行号
    末尾行号可能为-1，表示全文结尾
    若起始行号返回-1，表示未找到符合条件的起始H1
    
    headings: **必须**按line升序排序
    */
    
    // 从光标行（含）向前查找H1
    let startLine = -1;
    for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        if (heading.level === 1) {
            if (heading.line <= cursorLine) {
                startLine = heading.line;
            } else { // 因为是升序排序，后续不会再有符合条件的起始H1
                break;
            }
        }
    }

    // 从光标行（不含）向后查找H1
    let endLine = -1;
    for (let i = headings.length-1; i >= 0; i--) {
        const heading = headings[i];
        if (heading.level === 1) {
            if (heading.line > cursorLine) {
                endLine = heading.line;
            } else { // 因为是升序排序，前面不会再有符合条件的结束H1
                break;
            }
        }
    }

    return [startLine, endLine];
}

function getAllH2inRange(headings, startLine, endLine) {
    /*
    返回在[startLine, endLine)范围内的所有H2标题
    */
    const h2s = [];
    for (const heading of headings) {
        if (heading.level === 2 &&
            heading.line >= startLine &&
            heading.line < endLine) {
            h2s.push(heading);
        }
    }

    // 防御式排序
    h2s.sort((a, b) => a.line - b.line);
    return h2s;
}

function splitTextByLines(text_lines, line_nums) {
    /*
    按照lines数组指定的行号拆分文本
    lines: 0-based行号数组，表示拆分点, 必须升序排列
    返回拆分后的文本数组，仅包含line_nums夹间的文本，不含开头结尾
    */
    const result = [];
    for (let i = 0; i < line_nums.length - 1; i++) {
        const start = line_nums[i] + 1; // +1表示不包含标题行
        const end = line_nums[i + 1];
        const segment = text_lines.slice(start, end).join('\n');
        result.push(segment);
    }
    return result;
}

function shiftHeadingLevel(paragraph, shift) {
    /*
    将段落中的所有标题级别上移或下移shift级
    shift: 正数表示下移，负数表示上移
    如果新级别小于1或大于6，返回null
    */
   const tokens = md.parse(paragraph, {});
   const paragraph_lines = paragraph.split('\n');
   const headings = getHeadingsByLevels(tokens, new Set([1,2,3,4,5,6]));
   for (const heading of headings) {
        let newLevel = heading.level + shift;
        if (newLevel < 1 || newLevel > 6) {
            return null;
        }
        // 在paragraph的heading.line行修改标题
        const lineIndex = heading.line;
        const lineText = paragraph_lines[lineIndex];
        const newLineText = lineText.replace(
            new RegExp(`^#{1,6}(\\s+)`),
            '#'.repeat(newLevel) + '$1'
        );
        paragraph_lines[lineIndex] = newLineText;
   }
    return paragraph_lines.join('\n');
}

module.exports = {
    parseMarkdown,
    getHeadingsByLevels,
    getContextLineRange,
    getAllH2inRange,
    splitTextByLines,
    shiftHeadingLevel,
};