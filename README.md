# Restful Tool - VSCode REST API 可视化工具

一个强大的 VSCode 扩展，用于可视化和管理多框架的 REST API 端点。

## 功能特性

- 🔍 自动扫描并识别多种框架的 API 端点
- 📝 支持的框架：
  - Java: Spring Boot, JAX-RS
  - Go: Gin, Echo
  - Python: FastAPI, Flask
- 🌲 树形结构展示所有 API 端点
- 🔎 快速搜索和过滤功能（快捷键：`Ctrl+Alt+\`）
- 🎨 HTTP 方法的彩色图标标识
- ⚡ 实时自动更新
- 🔗 快速跳转到端点定义

## 使用指南

1. 安装扩展后，在 VSCode 左侧活动栏会出现 Restful Tool 图标
2. 点击图标打开 API 端点树视图
3. 自动扫描当前工作区的所有支持的框架文件
4. 使用顶部工具栏进行以下操作：
   - 🔍 搜索：快速查找端点（Ctrl+Alt+\）
   - 🔄 刷新：手动更新端点列表
   - ❌ 清除：清除搜索结果

## 搜索功能

- 支持多个字段搜索：
  - API 路径
  - HTTP 方法
  - 类名和方法名
  - 框架名称
- 实时过滤和匹配
- 支持部分匹配和大小写不敏感

## 框架支持

### Java
- Spring Boot
  - @Controller/@RestController
  - @RequestMapping
  - @GetMapping/@PostMapping 等
- JAX-RS
  - @Path
  - @GET/@POST 等

### Go
- Gin
  - router.GET/POST 等
- Echo
  - e.GET/POST 等

### Python
- FastAPI
  - @app.get/post 等
- Flask
  - @app.route

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 开源许可

MIT License

Copyright (c) 2024 Feifei Zhao

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.