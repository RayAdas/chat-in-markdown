# 简介

这是一个 VS Code 插件，使用 Markdown 文件保存与大模型的完整对话历史。你可以像编辑普通文档一样，随时修改 user / system / assistant 的内容，便于修正 AI 回复中的错误或不符合预期的部分。

插件名称：**Chat in Markdown**

---

# 配置

打开 VS Code 设置，搜索 `Chat in Markdown`，可以配置以下选项：

- `chat-in-markdown.baseURL`
    - 默认值：`https://api.deepseek.com/v1`
    - 用于指定兼容 OpenAI 接口的服务地址。
- `chat-in-markdown.model`
    - 默认值：`deepseek-chat`
    - 用于指定要调用的模型名称。
- `chat-in-markdown.singleFileMode`
    - 默认值：`false`
    - 关闭（默认）时：使用 **一级标题 `#` 划分会话上下文**，使用 **二级标题 `##` 划分角色**；
    - 开启时：**整个文件作为一个上下文**，使用 **一级标题 `#` 划分角色**。

## API Key（使用 SecretStorage）

- 第一次发送聊天时，如果 SecretStorage 中不存在密钥，会弹出一个输入框：
    - 在输入框中填入你的 LLM API Key；
    - 插件会自动将其写入 SecretStorage，并在后续调用中复用；
    - Key 不会以明文形式保存在 `settings.json` 中。
- 如果曾经在 `chat-in-markdown.apiKey` 旧配置中设置过 Key，插件会在首次使用时自动迁移到 SecretStorage。

### 如何重新设置 / 更换密钥？

- 打开命令面板：`Ctrl+Shift+P`（或 `Cmd+Shift+P`）。
- 输入并执行：`Chat in Markdown: Reset API Key`。
- 这会清除当前保存在 SecretStorage 中的密钥；
- 下次使用 “Send Chat” 时，插件会再次弹出输入框，要求你输入新的 API Key。

---

# 使用方法

1. 新建或打开一个 Markdown 文件（`.md`）。
2. 按下快捷键 `Ctrl+Alt+C`，或在编辑器标题栏点击 `Send Chat` 图标。
3. 插件会：
     - 在**普通模式**（`singleFileMode = false`）下：
         - 以光标所在位置向上最近的 **一级标题 `#`** 为当前对话块的起点；
         - 在该 H1 区块内，读取所有 **二级标题 `##`** 及其下方内容，分别作为一条消息发送给 LLM；
         - 在当前 H1 区块结尾插入 `## assistant` 标题，并以流式方式写入模型返回内容。
     - 在 **Single File Mode**（`singleFileMode = true`）下：
         - 整个文件被视为一个会话上下文，不再按 H1 分割多个对话；
         - 文件中所有 **一级标题 `#`** 作为不同角色（如 `# system` / `# user` / `# assistant`）被读取并发送给 LLM；
         - 回复会在文件末尾插入 `# assistant` 标题，并以流式方式写入模型返回内容。

当模型回复中的内容使用了 Markdown 标题（例如 `#`、`##`），插件会自动对这些标题进行**降级处理**，避免与会话标题 / 角色标题抢占同一层级，从而保持文档结构清晰：
- 在普通模式下整体下调两级
- 在 Single File Mode 下则为一级。

同理，在发送上下文给大模型之前，插件还会对要发送的文本片段中的 Markdown 标题进行**级别上移**（减少前缀 `#` 的数量）：

- 普通模式下，为了抵消会话 H1 / 角色 H2 占用的两级标题，会把片段内的标题整体上移约 2 级；
- Single File Mode 下，由于只用 H1 表示角色，片段内的标题只会整体上移约 1 级；

---

# 格式规范

## 普通模式

- 每一个聊天会话使用一级标题 `#`，标题名可为任意文本，不会加入大模型上下文：
    - 例如：`# Translate`、`# Bugfix` 等。
- 每一次消息使用二级标题 `##`，标题名为角色：
    - 通常可以为 `system`（或 `developer`，取决于你使用的模型）、`user` 和 `assistant`。
- 角色标题下的所有内容，都会被视为该角色的一条完整消息发送给 LLM。

## Single File Mode

- 每一次消息使用一级标题 `#`，标题名为角色：
    - 通常可以为 `system`（或 `developer`，取决于你使用的模型）、`user` 和 `assistant`。
- 角色标题下的所有内容，都会被视为该角色的一条完整消息发送给 LLM。

# 使用例（普通模式）
``` markdown
# Translate
## system
将用户的输入翻译为英文。英文翻译为中文。
## user
~~~cs
    /// <summary>
    /// Gets or sets the convert function called when deserializing a value from TOML to a model (e.g string to Uri).
    /// 
    /// Must return null if cannot convert. The arguments of the function are:
    /// - The input object value to convert.
    /// - The target type to convert to.
    /// 
    /// Returns an instance of target type converted from the input value or null if conversion is not supported.
    /// </summary>
    public Func<object, Type, object?>? ConvertToModel { get; set; }

    /// <summary>
    /// Gets or sets the convert function called when serializing a value from a model to a TOML representation.
    /// This function allows to substitute a value to another type before converting (e.g Uri to string).
    /// </summary>
    public Func<object, object?>? ConvertToToml { get; set; }
~~~
## assistant
~~~cs
    /// <summary>
    /// 获取或设置从TOML反序列化值到模型时调用的转换函数（例如从字符串转换为Uri）。
    /// 
    /// 如果无法转换，则必须返回null。函数的参数为：
    /// - 要转换的输入对象值。
    /// - 要转换到的目标类型。
    /// 
    /// 返回从输入值转换而来的目标类型的实例，如果不支持转换则返回null。
    /// </summary>
    public Func<object, Type, object?>? ConvertToModel { get; set; }

    /// <summary>
    /// 获取或设置从模型序列化值到TOML表示时调用的转换函数。
    /// 此函数允许在转换之前将值替换为另一种类型（例如从Uri转换为字符串）。
    /// </summary>
    public Func<object, object?>? ConvertToToml { get; set; }
~~~
```
