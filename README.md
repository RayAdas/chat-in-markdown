# 简介

这是一个VSCODE插件，使用Markdown格式保存聊天记录，可以很方便的修改AI回复中的错误/不符合目标的内容。

# 格式规范

每一个聊天应使用一级标题#，标题名为对话名称

每一次回复应使用二级标题##，标题名为角色，可以为system(或developer，取决于你使用的AI模型）、user和assistant

对于AI返回的聊天内容中的markdown标题，将自动增加两级的标题缩进

# 使用例
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
