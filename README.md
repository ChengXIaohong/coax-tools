# HTML Tools

一个实用的 HTML 工具集合，包含各种日常使用的工具页面。

## 工具列表

- [单位换算器](pages/converter.html) - 支持多种单位之间的换算
- [JSON 格式化工具](pages/json-formatter.html) - JSON 数据格式化和美化
- [密码生成器](pages/password-generator.html) - 安全密码生成工具
- [文本切割器](pages/text-slicer.html) - 大文本分割工具
- [时间戳转换器](pages/timestamp-converter.html) - 时间戳与日期相互转换
- [身份证生成器](pages/id-generator.html) - 身份证号码生成和校验
- [数据生成器](pages/data-generator.html) - 各种测试数据生成工具
- [DOCX 转换器](pages/docx-converter.html) - DOCX 文档处理工具
- [图像压缩器](pages/image-compressor.html) - 图片压缩工具
- [文本转换器](pages/text-converter.html) - 文本格式转换工具
- [文本阅读器](pages/text-reader.html) - 文本文件阅读器

## 功能特点

- 纯前端实现，无需后端支持
- 响应式设计，支持桌面和移动设备
- 工具之间相互独立，可单独使用
- 代码简洁，易于扩展和维护

## 使用方法

1. 直接在浏览器中打开对应的 HTML 文件即可使用
2. 所有工具均为纯前端实现，无需服务器支持
3. 支持离线使用（部分需要网络资源的工具除外）

## 测试

本项目包含一套完整的前端测试套件，位于 [test](test) 目录中：

- [测试入口](test/index.html) - 主控制台，可选择运行各个工具的测试
- [各工具测试页面](test/pages) - 每个工具都有对应的测试页面
- [公共资源](test/assets) - 测试使用的样式和模拟数据
- [测试工具库](test/utils) - 测试执行相关的工具脚本

要运行测试，只需在浏览器中打开 [test/index.html](test/index.html) 文件，然后选择要测试的工具即可。

## SEO优化

项目包含 [robots.txt](robots.txt) 和 [sitemap.xml](sitemap.xml) 文件，用于搜索引擎优化和爬虫访问控制。

## 版权信息

本项目所有文件均包含详细的版权和许可证信息：

```
/*
 * coax的小工具 - 一套实用的前端工具集合
 * 
 * MIT License
 * 
 * Copyright (c) 2025 coax
 * 
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 * 
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 * 
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 * 
 *  一套实用的前端工具集合，包括文本处理、数据转换、文件操作等多种实用工具。
 *  源码可得，快乐加倍！记得给个Star哦~ 🌟
 */
```

## 安装和部署

```bash
# 克隆项目
git clone https://github.com/yourusername/html-tools.git

# 进入项目目录
cd coax-tools

# 启动本地服务器（可选）
npx serve
```

## 支持的浏览器

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

本项目采用 MIT 许可证，详情请见 [LICENSE](LICENSE) 文件。

## 作者

coax